// Performance monitoring utilities for high-volume operations

export interface QueryMetrics {
  queryName: string;
  duration: number;
  recordCount?: number;
  timestamp: Date;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetricsHistory = 1000; // Keep last 1000 queries

  // Log query performance
  async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>,
    getRecordCount?: (result: T) => number
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      const recordCount = getRecordCount ? getRecordCount(result) : undefined;
      
      this.addMetric({
        queryName,
        duration,
        recordCount,
        timestamp: new Date(),
        success: true
      });
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`🐌 Slow query: ${queryName} took ${duration}ms${recordCount ? ` (${recordCount} records)` : ''}`);
      }
      
      // Log all queries in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚡ Query ${queryName}: ${duration}ms${recordCount ? ` (${recordCount} records)` : ''}`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.addMetric({
        queryName,
        duration,
        timestamp: new Date(),
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      
      console.error(`❌ Query ${queryName} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  private addMetric(metric: QueryMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  // Get performance statistics
  getStats(timeWindowMs?: number): {
    totalQueries: number;
    successRate: number;
    averageDuration: number;
    slowQueries: number;
    topSlowQueries: Array<{ queryName: string; maxDuration: number; count: number }>;
  } {
    const now = Date.now();
    const filtered = timeWindowMs 
      ? this.metrics.filter(m => now - m.timestamp.getTime() <= timeWindowMs)
      : this.metrics;

    if (filtered.length === 0) {
      return {
        totalQueries: 0,
        successRate: 100,
        averageDuration: 0,
        slowQueries: 0,
        topSlowQueries: []
      };
    }

    const successful = filtered.filter(m => m.success);
    const slowQueries = filtered.filter(m => m.duration > 1000);
    
    // Group by query name for top slow queries
    const queryGroups = filtered.reduce((acc, metric) => {
      if (!acc[metric.queryName]) {
        acc[metric.queryName] = { maxDuration: 0, count: 0 };
      }
      acc[metric.queryName].maxDuration = Math.max(acc[metric.queryName].maxDuration, metric.duration);
      acc[metric.queryName].count += 1;
      return acc;
    }, {} as Record<string, { maxDuration: number; count: number }>);

    const topSlowQueries = Object.entries(queryGroups)
      .map(([queryName, stats]) => ({ queryName, ...stats }))
      .sort((a, b) => b.maxDuration - a.maxDuration)
      .slice(0, 10);

    return {
      totalQueries: filtered.length,
      successRate: (successful.length / filtered.length) * 100,
      averageDuration: filtered.reduce((sum, m) => sum + m.duration, 0) / filtered.length,
      slowQueries: slowQueries.length,
      topSlowQueries
    };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Helper function for monitoring database queries
export async function monitorDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  getRecordCount?: (result: T) => number
): Promise<T> {
  return performanceMonitor.monitorQuery(queryName, queryFn, getRecordCount);
}

// Performance recommendations based on metrics
export function getPerformanceRecommendations(): string[] {
  const stats = performanceMonitor.getStats(300000); // Last 5 minutes
  const recommendations: string[] = [];

  if (stats.averageDuration > 500) {
    recommendations.push('⚠️  Average query duration is high (>500ms). Consider adding database indexes or optimizing queries.');
  }

  if (stats.slowQueries > stats.totalQueries * 0.1) {
    recommendations.push('🐌 More than 10% of queries are slow (>1s). Review query patterns and database indexes.');
  }

  if (stats.successRate < 95) {
    recommendations.push('❌ Query failure rate is high. Check database connection and error handling.');
  }

  if (stats.topSlowQueries.length > 0) {
    const slowest = stats.topSlowQueries[0];
    recommendations.push(`🎯 Focus on optimizing "${slowest.queryName}" - max duration: ${slowest.maxDuration}ms`);
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Database performance looks good!');
  }

  return recommendations;
} 