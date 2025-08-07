# Memory Management Guide

## Overview

This document provides guidance on proper memory management for AgriTool's monitoring and analytics systems to prevent memory leaks and ensure optimal performance.

## Memory Leak Fixes Applied

### 1. PerformanceDashboard Singleton
**Issue**: Uncontrolled setInterval calls in constructor without cleanup mechanism.

**Fix**: Added proper interval management with cleanup method.

```typescript
// Cleanup when component unmounts or app shuts down
import { performanceDashboard } from '@/lib/performanceDashboard';

// In component cleanup or app shutdown
performanceDashboard.cleanup();
```

### 2. UserAnalytics Singleton
**Issue**: Batch processor interval without cleanup mechanism.

**Fix**: Added proper interval management with cleanup method.

```typescript
// Cleanup when app shuts down
import { userAnalytics } from '@/lib/userAnalytics';

// In app shutdown or logout
userAnalytics.cleanup();
```

### 3. MonitoringAnalytics Hook
**Issue**: Fixed refresh interval not being configurable.

**Fix**: Made refresh interval configurable with proper cleanup.

```typescript
// Use with custom refresh interval
const { overview, loading } = useMonitoringAnalytics(30000); // 30 seconds

// Use with default interval (60 seconds)
const { overview, loading } = useMonitoringAnalytics();
```

## Best Practices

### 1. Component Cleanup
Always clean up resources when components unmount:

```typescript
useEffect(() => {
  return () => {
    // Cleanup any intervals, timeouts, or event listeners
  };
}, []);
```

### 2. Singleton Management
For singleton services, provide cleanup methods:

```typescript
class MySingleton {
  private interval?: NodeJS.Timeout;
  private isDestroyed = false;

  constructor() {
    this.startProcessing();
  }

  private startProcessing(): void {
    if (this.isDestroyed) return;
    
    this.interval = setInterval(() => {
      if (this.isDestroyed) return;
      // Processing logic
    }, 5000);
  }

  cleanup(): void {
    this.isDestroyed = true;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}
```

### 3. App-Level Cleanup
Implement app-level cleanup for production:

```typescript
// In main app component or index.ts
window.addEventListener('beforeunload', () => {
  performanceDashboard.cleanup();
  userAnalytics.cleanup();
});
```

## Monitoring Memory Usage

### Development Monitoring
Use browser DevTools to monitor memory usage:

1. Open Chrome DevTools
2. Go to Performance tab
3. Record a session while using the app
4. Check for memory leaks in the timeline

### Production Monitoring
The PerformanceDashboard automatically tracks memory usage:

```typescript
// Memory metrics are automatically collected
const memoryStats = performanceDashboard.getMetricStats('memory_usage');
console.log('Memory usage trend:', memoryStats.trend);
```

## Common Anti-Patterns to Avoid

### ❌ Don't: Unmanaged Intervals
```typescript
// BAD: No cleanup
setInterval(() => {
  // Processing
}, 1000);
```

### ✅ Do: Managed Intervals
```typescript
// GOOD: Proper cleanup
useEffect(() => {
  const interval = setInterval(() => {
    // Processing
  }, 1000);
  
  return () => clearInterval(interval);
}, []);
```

### ❌ Don't: Singleton Without Cleanup
```typescript
// BAD: No way to clean up
class BadSingleton {
  constructor() {
    setInterval(this.process, 1000);
  }
}
```

### ✅ Do: Singleton With Cleanup
```typescript
// GOOD: Cleanup method provided
class GoodSingleton {
  private interval?: NodeJS.Timeout;
  
  constructor() {
    this.interval = setInterval(this.process, 1000);
  }
  
  cleanup(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
```

## Performance Impact

These fixes provide:

- **Memory leak prevention**: Proper cleanup prevents memory accumulation
- **Resource management**: Controlled interval lifecycle
- **Production stability**: Reduced memory pressure over time
- **Configurable monitoring**: Adjustable refresh rates based on needs

## Testing Memory Management

```typescript
// Test cleanup in unit tests
describe('Memory Management', () => {
  it('should cleanup intervals on destroy', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    const instance = new UserAnalytics();
    instance.cleanup();
    
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
```

## Conclusion

Proper memory management is crucial for long-running applications. These fixes ensure that AgriTool's monitoring and analytics systems don't accumulate memory over time, providing stable performance in production environments.