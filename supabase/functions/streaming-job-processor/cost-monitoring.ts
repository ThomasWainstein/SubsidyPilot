// Cost monitoring and quota management
export interface CostTracker {
  operationType: string;
  documentId: string;
  userId?: string;
  estimatedCost: number;
  actualCost?: number;
  timestamp: string;
  metadata: {
    fileSize: number;
    pages: number;
    processingTier: string;
    model?: string;
    tokensUsed?: number;
    processingTimeMs: number;
  };
}

export interface QuotaLimits {
  dailySpendLimit: number; // USD
  monthlySpendLimit: number; // USD
  dailyDocumentLimit: number;
  monthlyDocumentLimit: number;
}

export const DEFAULT_QUOTAS: QuotaLimits = {
  dailySpendLimit: 50.0, // $50/day
  monthlySpendLimit: 500.0, // $500/month
  dailyDocumentLimit: 1000,
  monthlyDocumentLimit: 10000
};

export class CostMonitor {
  private static readonly VISION_BASE_COST = 0.0015; // $1.50 per 1000 pages
  private static readonly OPENAI_COSTS = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // per 1K tokens
    'gpt-4.1-2025-04-14': { input: 0.0025, output: 0.01 },
    'gpt-5-2025-08-07': { input: 0.005, output: 0.02 }
  };

  static estimateVisionCost(pages: number, fileSize: number): number {
    // Base OCR cost
    let cost = pages * this.VISION_BASE_COST;
    
    // Add complexity multiplier for large files
    if (fileSize > 10 * 1024 * 1024) { // > 10MB
      cost *= 1.5; // 50% surcharge for complex documents
    }
    
    return Math.round(cost * 100000) / 100000; // Round to 5 decimal places
  }

  static estimateAICost(model: string, inputTokens: number, outputTokens: number): number {
    const costs = this.OPENAI_COSTS[model as keyof typeof this.OPENAI_COSTS];
    if (!costs) {
      console.warn(`Unknown model ${model}, using default costs`);
      return 0.001; // Default fallback
    }

    const inputCost = (inputTokens / 1000) * costs.input;
    const outputCost = (outputTokens / 1000) * costs.output;
    
    return Math.round((inputCost + outputCost) * 100000) / 100000;
  }

  static createCostEntry(
    operationType: string,
    documentId: string,
    estimatedCost: number,
    metadata: CostTracker['metadata'],
    userId?: string
  ): CostTracker {
    return {
      operationType,
      documentId,
      userId,
      estimatedCost,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  static async checkQuotas(userId: string, estimatedCost: number): Promise<{
    allowed: boolean;
    reason?: string;
    remainingBudget?: number;
    quotaType?: string;
  }> {
    // In production, this would check against actual usage from database
    // For now, return basic validation
    
    if (estimatedCost > 10.0) {
      return {
        allowed: false,
        reason: `Single document cost too high: $${estimatedCost.toFixed(4)}. Maximum allowed: $10.00`,
        quotaType: 'per_document'
      };
    }

    // Basic daily limit check (simplified)
    const dailyUsage = 0; // Would fetch from database
    const remainingDaily = DEFAULT_QUOTAS.dailySpendLimit - dailyUsage;
    
    if (estimatedCost > remainingDaily) {
      return {
        allowed: false,
        reason: `Would exceed daily spending limit. Remaining budget: $${remainingDaily.toFixed(2)}`,
        remainingBudget: remainingDaily,
        quotaType: 'daily'
      };
    }

    return {
      allowed: true,
      remainingBudget: remainingDaily
    };
  }

  static formatCostSummary(costTracker: CostTracker): string {
    const { estimatedCost, actualCost, metadata } = costTracker;
    
    return [
      `💰 Cost Summary:`,
      `  Estimated: $${estimatedCost.toFixed(4)}`,
      actualCost ? `  Actual: $${actualCost.toFixed(4)}` : '',
      `  File: ${this.formatBytes(metadata.fileSize)} (${metadata.pages} pages)`,
      `  Processing: ${metadata.processingTimeMs}ms (${metadata.processingTier} tier)`,
      metadata.model ? `  Model: ${metadata.model}` : '',
      metadata.tokensUsed ? `  Tokens: ${metadata.tokensUsed.toLocaleString()}` : ''
    ].filter(Boolean).join('\n');
  }

  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  static getCostBreakdown(pages: number, fileSize: number, model?: string, tokens?: number): {
    visionCost: number;
    aiCost: number;
    totalEstimated: number;
    breakdown: string;
  } {
    const visionCost = this.estimateVisionCost(pages, fileSize);
    const aiCost = model && tokens ? this.estimateAICost(model, tokens * 0.7, tokens * 0.3) : 0;
    const totalEstimated = visionCost + aiCost;

    const breakdown = [
      `Vision OCR: $${visionCost.toFixed(4)} (${pages} pages)`,
      aiCost > 0 ? `AI Processing: $${aiCost.toFixed(4)} (${model})` : null,
      `Total: $${totalEstimated.toFixed(4)}`
    ].filter(Boolean).join(' + ');

    return {
      visionCost,
      aiCost,
      totalEstimated,
      breakdown
    };
  }
}

export class PerformanceMonitor {
  private static metrics: Map<string, any[]> = new Map();

  static recordMetric(operation: string, value: number, metadata?: any) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    this.metrics.get(operation)!.push({
      value,
      timestamp: Date.now(),
      metadata
    });

    // Limit history to last 100 entries per operation
    const entries = this.metrics.get(operation)!;
    if (entries.length > 100) {
      entries.splice(0, entries.length - 100);
    }
  }

  static getStats(operation: string): {
    count: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const entries = this.metrics.get(operation);
    if (!entries || entries.length === 0) return null;

    const values = entries.map(e => e.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count,
      avg: sum / count,
      p50: values[Math.floor(count * 0.5)],
      p95: values[Math.floor(count * 0.95)],
      p99: values[Math.floor(count * 0.99)]
    };
  }

  static logPerformanceSummary() {
    console.log('\n📊 Performance Summary:');
    for (const [operation, _] of this.metrics) {
      const stats = this.getStats(operation);
      if (stats) {
        console.log(`  ${operation}: avg=${stats.avg.toFixed(0)}ms, p95=${stats.p95}ms (${stats.count} samples)`);
      }
    }
  }
}