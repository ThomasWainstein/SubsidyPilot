import { logger } from './logger';
import { monitoring } from './monitoring';
import { PRODUCTION_CONFIG } from '@/config/production';

export interface ScalingMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  activeUsers: number;
  queueDepth: number;
}

export interface LoadBalancingStrategy {
  type: 'round-robin' | 'least-connections' | 'weighted' | 'performance-based';
  weights?: number[];
  healthCheck?: () => Promise<boolean>;
}

export interface HorizontalScalingConfig {
  minInstances: number;
  maxInstances: number;
  targetCPUUtilization: number;
  targetMemoryUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

class HorizontalScaling {
  private static instance: HorizontalScaling;
  private currentLoad: ScalingMetrics = {
    responseTime: 0,
    throughput: 0,
    errorRate: 0,
    memoryUsage: 0,
    activeUsers: 0,
    queueDepth: 0
  };
  
  private instances: string[] = ['primary'];
  private loadBalancer: { strategy: LoadBalancingStrategy; currentIndex: number } = {
    strategy: { type: 'round-robin' },
    currentIndex: 0
  };

  private scalingHistory: Array<{
    timestamp: number;
    action: 'scale-up' | 'scale-down';
    reason: string;
    instanceCount: number;
  }> = [];

  static getInstance(): HorizontalScaling {
    if (!HorizontalScaling.instance) {
      HorizontalScaling.instance = new HorizontalScaling();
    }
    return HorizontalScaling.instance;
  }

  constructor() {
    this.startMetricsCollection();
    this.startAutoScaling();
  }

  // Load balancing
  setLoadBalancingStrategy(strategy: LoadBalancingStrategy): void {
    this.loadBalancer.strategy = strategy;
    logger.info('Load balancing strategy updated', { type: strategy.type });
  }

  getNextInstance(): string {
    const { strategy } = this.loadBalancer;

    switch (strategy.type) {
      case 'round-robin':
        return this.roundRobinSelection();
      
      case 'least-connections':
        return this.leastConnectionsSelection();
      
      case 'weighted':
        return this.weightedSelection();
      
      case 'performance-based':
        return this.performanceBasedSelection();
      
      default:
        return this.instances[0] || 'primary';
    }
  }

  private roundRobinSelection(): string {
    const instance = this.instances[this.loadBalancer.currentIndex];
    this.loadBalancer.currentIndex = (this.loadBalancer.currentIndex + 1) % this.instances.length;
    return instance;
  }

  private leastConnectionsSelection(): string {
    // Simplified: assume primary has least connections
    // In real implementation, track active connections per instance
    return this.instances[0] || 'primary';
  }

  private weightedSelection(): string {
    const weights = this.loadBalancer.strategy.weights || [1];
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < this.instances.length; i++) {
      random -= weights[i] || 1;
      if (random <= 0) {
        return this.instances[i];
      }
    }
    
    return this.instances[0] || 'primary';
  }

  private performanceBasedSelection(): string {
    // Select instance based on performance metrics
    // In real implementation, track per-instance metrics
    return this.instances[0] || 'primary';
  }

  // Auto-scaling logic
  private startAutoScaling(): void {
    setInterval(() => {
      this.evaluateScalingNeeds();
    }, 30000); // Evaluate every 30 seconds
  }

  private evaluateScalingNeeds(): void {
    const config: HorizontalScalingConfig = {
      minInstances: 1,
      maxInstances: 5,
      targetCPUUtilization: 70,
      targetMemoryUtilization: 80,
      scaleUpThreshold: 85,
      scaleDownThreshold: 30,
      cooldownPeriod: 300000 // 5 minutes
    };

    const shouldScaleUp = this.shouldScaleUp(config);
    const shouldScaleDown = this.shouldScaleDown(config);

    if (shouldScaleUp && this.instances.length < config.maxInstances) {
      this.scaleUp(config);
    } else if (shouldScaleDown && this.instances.length > config.minInstances) {
      this.scaleDown(config);
    }
  }

  private shouldScaleUp(config: HorizontalScalingConfig): boolean {
    const { currentLoad } = this;
    
    return (
      currentLoad.memoryUsage > config.scaleUpThreshold ||
      currentLoad.responseTime > 2000 ||
      currentLoad.errorRate > 5 ||
      currentLoad.queueDepth > 100
    ) && this.isOutOfCooldownPeriod(config.cooldownPeriod);
  }

  private shouldScaleDown(config: HorizontalScalingConfig): boolean {
    const { currentLoad } = this;
    
    return (
      currentLoad.memoryUsage < config.scaleDownThreshold &&
      currentLoad.responseTime < 500 &&
      currentLoad.errorRate < 1 &&
      currentLoad.queueDepth < 10
    ) && this.isOutOfCooldownPeriod(config.cooldownPeriod);
  }

  private isOutOfCooldownPeriod(cooldownPeriod: number): boolean {
    if (this.scalingHistory.length === 0) return true;
    
    const lastScaling = this.scalingHistory[this.scalingHistory.length - 1];
    return Date.now() - lastScaling.timestamp > cooldownPeriod;
  }

  private scaleUp(config: HorizontalScalingConfig): void {
    const newInstanceId = `instance-${Date.now()}`;
    this.instances.push(newInstanceId);

    const scalingAction = {
      timestamp: Date.now(),
      action: 'scale-up' as const,
      reason: this.getScalingReason('up'),
      instanceCount: this.instances.length
    };

    this.scalingHistory.push(scalingAction);

    monitoring.captureMetric({
      name: 'horizontal_scaling_event',
      value: this.instances.length,
      timestamp: Date.now(),
      context: scalingAction
    });

    logger.info('Scaled up instance', {
      newInstanceId,
      totalInstances: this.instances.length,
      reason: scalingAction.reason
    });
  }

  private scaleDown(config: HorizontalScalingConfig): void {
    if (this.instances.length <= config.minInstances) return;

    const removedInstance = this.instances.pop();

    const scalingAction = {
      timestamp: Date.now(),
      action: 'scale-down' as const,
      reason: this.getScalingReason('down'),
      instanceCount: this.instances.length
    };

    this.scalingHistory.push(scalingAction);

    monitoring.captureMetric({
      name: 'horizontal_scaling_event',
      value: this.instances.length,
      timestamp: Date.now(),
      context: scalingAction
    });

    logger.info('Scaled down instance', {
      removedInstance,
      totalInstances: this.instances.length,
      reason: scalingAction.reason
    });
  }

  private getScalingReason(direction: 'up' | 'down'): string {
    const { currentLoad } = this;
    
    if (direction === 'up') {
      if (currentLoad.memoryUsage > 85) return 'High memory usage';
      if (currentLoad.responseTime > 2000) return 'High response time';
      if (currentLoad.errorRate > 5) return 'High error rate';
      if (currentLoad.queueDepth > 100) return 'High queue depth';
      return 'Performance degradation';
    } else {
      return 'Low resource utilization';
    }
  }

  // Metrics collection
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectCurrentMetrics();
    }, 5000); // Collect every 5 seconds
  }

  private collectCurrentMetrics(): void {
    // Simulate metrics collection
    // In real implementation, these would come from actual monitoring
    this.currentLoad = {
      responseTime: this.simulateResponseTime(),
      throughput: this.simulateThroughput(),
      errorRate: this.simulateErrorRate(),
      memoryUsage: this.getMemoryUsage(),
      activeUsers: this.simulateActiveUsers(),
      queueDepth: this.simulateQueueDepth()
    };

    // Report metrics
    Object.entries(this.currentLoad).forEach(([metric, value]) => {
      monitoring.captureMetric({
        name: `scaling_${metric}`,
        value,
        timestamp: Date.now(),
        context: { instanceCount: this.instances.length }
      });
    });
  }

  private simulateResponseTime(): number {
    // Simulate response time based on load
    const baseTime = 200;
    const loadFactor = this.instances.length > 1 ? 0.7 : 1;
    return baseTime * loadFactor + Math.random() * 100;
  }

  private simulateThroughput(): number {
    // Requests per second
    return Math.floor(Math.random() * 100) + 50;
  }

  private simulateErrorRate(): number {
    // Error percentage
    return Math.random() * 5;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
    return Math.random() * 100;
  }

  private simulateActiveUsers(): number {
    return Math.floor(Math.random() * 500) + 100;
  }

  private simulateQueueDepth(): number {
    return Math.floor(Math.random() * 50);
  }

  // Circuit breaker for scaling decisions
  private circuitBreaker = {
    failures: 0,
    lastFailure: 0,
    state: 'closed' as 'open' | 'closed' | 'half-open'
  };

  canScale(): boolean {
    const now = Date.now();
    
    if (this.circuitBreaker.state === 'open') {
      // Check if we should transition to half-open
      if (now - this.circuitBreaker.lastFailure > 300000) { // 5 minutes
        this.circuitBreaker.state = 'half-open';
        return true;
      }
      return false;
    }
    
    return true;
  }

  recordScalingFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();
    
    if (this.circuitBreaker.failures >= 3) {
      this.circuitBreaker.state = 'open';
      logger.warn('Scaling circuit breaker opened due to failures');
    }
  }

  recordScalingSuccess(): void {
    this.circuitBreaker.failures = 0;
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
    }
  }

  // Health checking
  async performHealthCheck(): Promise<{
    healthy: boolean;
    instances: Array<{ id: string; healthy: boolean; responseTime: number }>;
    overallMetrics: ScalingMetrics;
  }> {
    const instanceHealthChecks = await Promise.all(
      this.instances.map(async (instanceId) => {
        const startTime = Date.now();
        try {
          // Simulate health check
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          
          return {
            id: instanceId,
            healthy: Math.random() > 0.1, // 90% healthy rate
            responseTime: Date.now() - startTime
          };
        } catch {
          return {
            id: instanceId,
            healthy: false,
            responseTime: Date.now() - startTime
          };
        }
      })
    );

    const healthyInstances = instanceHealthChecks.filter(check => check.healthy);
    const isHealthy = healthyInstances.length > 0;

    return {
      healthy: isHealthy,
      instances: instanceHealthChecks,
      overallMetrics: this.currentLoad
    };
  }

  // Statistics and reporting
  getScalingStats(): {
    currentInstances: number;
    scalingHistory: typeof this.scalingHistory;
    currentMetrics: ScalingMetrics;
    loadBalancer: { strategy: string; instancesAvailable: number };
    circuitBreakerStatus: typeof this.circuitBreaker;
  } {
    return {
      currentInstances: this.instances.length,
      scalingHistory: [...this.scalingHistory].slice(-10), // Last 10 events
      currentMetrics: { ...this.currentLoad },
      loadBalancer: {
        strategy: this.loadBalancer.strategy.type,
        instancesAvailable: this.instances.length
      },
      circuitBreakerStatus: { ...this.circuitBreaker }
    };
  }
}

export const horizontalScaling = HorizontalScaling.getInstance();