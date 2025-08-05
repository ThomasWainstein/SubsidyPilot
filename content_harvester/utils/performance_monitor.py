#!/usr/bin/env python3
"""
Performance Monitor
==================

Comprehensive performance monitoring and optimization for content
harvesting operations with detailed metrics and profiling.
"""

import time
import psutil
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict, deque
import threading


@dataclass
class PerformanceMetric:
    """Individual performance metric measurement."""
    name: str
    value: float
    unit: str
    timestamp: float
    category: str = "general"
    metadata: Dict[str, Any] = field(default_factory=dict)


class PerformanceMonitor:
    """
    Comprehensive performance monitoring system.
    
    Tracks timing, memory usage, throughput, and other performance
    metrics for content harvesting operations.
    """
    
    def __init__(self, history_size: int = 1000):
        """
        Initialize performance monitor.
        
        Args:
            history_size: Maximum number of metrics to keep in history
        """
        self.logger = logging.getLogger(__name__)
        self.history_size = history_size
        
        # Metric storage
        self.metrics_history: deque = deque(maxlen=history_size)
        self.active_timers: Dict[str, float] = {}
        self.counters: Dict[str, int] = defaultdict(int)
        self.gauges: Dict[str, float] = {}
        
        # Performance statistics
        self.stats = {
            'total_operations': 0,
            'successful_operations': 0,
            'failed_operations': 0,
            'total_processing_time': 0.0,
            'average_processing_time': 0.0,
            'operations_per_second': 0.0,
            'peak_memory_usage': 0.0,
            'current_memory_usage': 0.0
        }
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Start system monitoring
        self._start_system_monitoring()
    
    def start_timer(self, operation_name: str) -> str:
        """
        Start timing an operation.
        
        Args:
            operation_name: Name of the operation to time
            
        Returns:
            Timer ID for stopping the timer
        """
        timer_id = f"{operation_name}_{int(time.time() * 1000000)}"
        
        with self._lock:
            self.active_timers[timer_id] = time.time()
        
        return timer_id
    
    def stop_timer(self, timer_id: str, metadata: Optional[Dict[str, Any]] = None) -> float:
        """
        Stop timing an operation and record the metric.
        
        Args:
            timer_id: Timer ID returned by start_timer
            metadata: Additional metadata for the metric
            
        Returns:
            Elapsed time in seconds
        """
        end_time = time.time()
        
        with self._lock:
            start_time = self.active_timers.pop(timer_id, end_time)
            elapsed_time = end_time - start_time
            
            # Record timing metric
            operation_name = timer_id.split('_')[0]
            self._record_metric(
                name=f"{operation_name}_duration",
                value=elapsed_time,
                unit="seconds",
                category="timing",
                metadata=metadata or {}
            )
            
            # Update statistics
            self.stats['total_operations'] += 1
            self.stats['total_processing_time'] += elapsed_time
            self.stats['average_processing_time'] = (
                self.stats['total_processing_time'] / self.stats['total_operations']
            )
        
        return elapsed_time
    
    def record_success(self, operation_name: str, metadata: Optional[Dict[str, Any]] = None):
        """Record a successful operation."""
        with self._lock:
            self.stats['successful_operations'] += 1
            self.counters[f"{operation_name}_success"] += 1
            
            self._record_metric(
                name=f"{operation_name}_success",
                value=1,
                unit="count",
                category="success",
                metadata=metadata or {}
            )
    
    def record_failure(self, operation_name: str, error_type: str = "unknown", metadata: Optional[Dict[str, Any]] = None):
        """Record a failed operation."""
        with self._lock:
            self.stats['failed_operations'] += 1
            self.counters[f"{operation_name}_failure"] += 1
            self.counters[f"error_{error_type}"] += 1
            
            self._record_metric(
                name=f"{operation_name}_failure",
                value=1,
                unit="count",
                category="failure",
                metadata={**(metadata or {}), "error_type": error_type}
            )
    
    def record_throughput(self, operation_name: str, count: int, duration: float):
        """
        Record throughput metrics.
        
        Args:
            operation_name: Name of the operation
            count: Number of items processed
            duration: Time taken in seconds
        """
        if duration > 0:
            throughput = count / duration
            
            with self._lock:
                self._record_metric(
                    name=f"{operation_name}_throughput",
                    value=throughput,
                    unit="items/second",
                    category="throughput",
                    metadata={"count": count, "duration": duration}
                )
                
                # Update operations per second
                self.stats['operations_per_second'] = throughput
    
    def record_memory_usage(self, operation_name: str = "system"):
        """Record current memory usage."""
        try:
            process = psutil.Process()
            memory_info = process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024  # Convert to MB
            
            with self._lock:
                self.stats['current_memory_usage'] = memory_mb
                if memory_mb > self.stats['peak_memory_usage']:
                    self.stats['peak_memory_usage'] = memory_mb
                
                self._record_metric(
                    name=f"{operation_name}_memory_usage",
                    value=memory_mb,
                    unit="MB",
                    category="memory",
                    metadata={
                        "rss": memory_info.rss,
                        "vms": memory_info.vms,
                        "percent": process.memory_percent()
                    }
                )
        
        except Exception as e:
            self.logger.warning(f"⚠️ Failed to record memory usage: {e}")
    
    def record_custom_metric(
        self, 
        name: str, 
        value: float, 
        unit: str = "count",
        category: str = "custom",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record a custom performance metric."""
        with self._lock:
            self._record_metric(name, value, unit, category, metadata or {})
    
    def get_summary(self) -> Dict[str, Any]:
        """Get comprehensive performance summary."""
        with self._lock:
            # Calculate success rate
            total_ops = self.stats['successful_operations'] + self.stats['failed_operations']
            success_rate = (
                self.stats['successful_operations'] / total_ops 
                if total_ops > 0 else 0.0
            )
            
            # Get recent metrics (last 5 minutes)
            recent_threshold = time.time() - 300
            recent_metrics = [
                metric for metric in self.metrics_history
                if metric.timestamp > recent_threshold
            ]
            
            # Calculate recent throughput
            recent_successes = len([
                m for m in recent_metrics 
                if m.category == "success"
            ])
            recent_throughput = recent_successes / 300 if recent_successes > 0 else 0.0
            
            return {
                'summary': {
                    'total_operations': self.stats['total_operations'],
                    'successful_operations': self.stats['successful_operations'],
                    'failed_operations': self.stats['failed_operations'],
                    'success_rate': success_rate,
                    'average_processing_time': self.stats['average_processing_time'],
                    'operations_per_second': self.stats['operations_per_second'],
                    'recent_throughput': recent_throughput
                },
                'memory': {
                    'current_usage_mb': self.stats['current_memory_usage'],
                    'peak_usage_mb': self.stats['peak_memory_usage'],
                    'system_total_mb': self._get_system_memory_total()
                },
                'timing': self._get_timing_summary(),
                'errors': self._get_error_summary(),
                'recent_metrics_count': len(recent_metrics),
                'total_metrics_recorded': len(self.metrics_history)
            }
    
    def get_detailed_metrics(self, category: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get detailed metrics with optional filtering.
        
        Args:
            category: Filter by metric category
            limit: Maximum number of metrics to return
            
        Returns:
            List of detailed metric data
        """
        with self._lock:
            metrics = list(self.metrics_history)
            
            # Filter by category if specified
            if category:
                metrics = [m for m in metrics if m.category == category]
            
            # Sort by timestamp (most recent first)
            metrics.sort(key=lambda m: m.timestamp, reverse=True)
            
            # Limit results
            metrics = metrics[:limit]
            
            # Convert to dictionaries
            return [
                {
                    'name': m.name,
                    'value': m.value,
                    'unit': m.unit,
                    'timestamp': m.timestamp,
                    'category': m.category,
                    'metadata': m.metadata
                }
                for m in metrics
            ]
    
    def get_performance_recommendations(self) -> List[str]:
        """Get performance optimization recommendations."""
        recommendations = []
        
        with self._lock:
            # Check success rate
            total_ops = self.stats['successful_operations'] + self.stats['failed_operations']
            if total_ops > 0:
                success_rate = self.stats['successful_operations'] / total_ops
                if success_rate < 0.9:
                    recommendations.append(
                        f"Success rate is {success_rate:.1%}. Consider investigating failed operations."
                    )
            
            # Check average processing time
            if self.stats['average_processing_time'] > 30:
                recommendations.append(
                    f"Average processing time is {self.stats['average_processing_time']:.1f}s. "
                    "Consider optimizing slow operations."
                )
            
            # Check memory usage
            if self.stats['current_memory_usage'] > 1000:  # 1GB
                recommendations.append(
                    f"Memory usage is {self.stats['current_memory_usage']:.1f}MB. "
                    "Consider optimizing memory-intensive operations."
                )
            
            # Check throughput
            if self.stats['operations_per_second'] < 1 and self.stats['total_operations'] > 10:
                recommendations.append(
                    "Low throughput detected. Consider increasing concurrency or optimizing processing."
                )
            
            if not recommendations:
                recommendations.append("Performance looks good! No immediate optimizations needed.")
        
        return recommendations
    
    def _record_metric(
        self, 
        name: str, 
        value: float, 
        unit: str, 
        category: str, 
        metadata: Dict[str, Any]
    ):
        """Record a metric (internal method, assumes lock is held)."""
        metric = PerformanceMetric(
            name=name,
            value=value,
            unit=unit,
            timestamp=time.time(),
            category=category,
            metadata=metadata
        )
        
        self.metrics_history.append(metric)
    
    def _start_system_monitoring(self):
        """Start background system monitoring."""
        def monitor_system():
            while True:
                try:
                    self.record_memory_usage("system")
                    time.sleep(60)  # Monitor every minute
                except Exception as e:
                    self.logger.warning(f"⚠️ System monitoring error: {e}")
                    time.sleep(60)
        
        monitor_thread = threading.Thread(target=monitor_system, daemon=True)
        monitor_thread.start()
    
    def _get_system_memory_total(self) -> float:
        """Get total system memory in MB."""
        try:
            return psutil.virtual_memory().total / 1024 / 1024
        except:
            return 0.0
    
    def _get_timing_summary(self) -> Dict[str, Any]:
        """Get timing metrics summary."""
        timing_metrics = [
            m for m in self.metrics_history 
            if m.category == "timing"
        ]
        
        if not timing_metrics:
            return {"count": 0}
        
        values = [m.value for m in timing_metrics]
        
        return {
            "count": len(timing_metrics),
            "min": min(values),
            "max": max(values),
            "average": sum(values) / len(values),
            "total": sum(values)
        }
    
    def _get_error_summary(self) -> Dict[str, Any]:
        """Get error metrics summary."""
        error_metrics = [
            m for m in self.metrics_history 
            if m.category == "failure"
        ]
        
        error_types = defaultdict(int)
        for metric in error_metrics:
            error_type = metric.metadata.get("error_type", "unknown")
            error_types[error_type] += 1
        
        return {
            "total_errors": len(error_metrics),
            "error_types": dict(error_types),
            "most_common_error": max(error_types.items(), key=lambda x: x[1], default=("none", 0))[0]
        }