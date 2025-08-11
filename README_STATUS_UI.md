# Real-Time Status & Retry UI - Phase E

This document describes the comprehensive real-time status tracking and retry system implemented for document processing.

## Features Overview

### 1. Database Schema Updates
- **New Status Enum**: Proper processing flow `uploading→virus_scan→extracting→ocr→ai→completed/failed`
- **Realtime Events**: Automatic Supabase realtime publishing for status changes
- **Retry Logic**: Built-in backoff strategy with configurable retry limits
- **Progress Tracking**: Detailed metadata for progress calculation

### 2. API Endpoints

#### POST `/api/documents/:id/retry`
Triggers a retry of failed document processing with intelligent backoff:

```typescript
// Request
POST /functions/v1/document-status-api/documents/{documentId}/retry

// Response
{
  "success": true,
  "documentId": "uuid",
  "retryAttempt": 2,
  "maxRetries": 3,
  "nextRetryAt": "2024-01-01T12:00:00Z",
  "delaySeconds": 300
}
```

**Features:**
- Exponential backoff with jitter (base: 5min, max: 1hr)
- Respect retry limits (default: 3 attempts)
- Idempotency key preservation for consistent processing
- Status validation before retry

#### GET `/api/documents/:id/status`
Real-time status endpoint with comprehensive metrics:

```typescript
// Response
{
  "documentId": "uuid",
  "document": {
    "filename": "document.pdf",
    "size": 1024000,
    "mimeType": "application/pdf",
    "uploadedAt": "2024-01-01T10:00:00Z"
  },
  "extraction": {
    "status": "extracting",
    "step": "Text Extraction", 
    "progress": 45,
    "confidence": 0.85,
    "tableCount": 3,
    "failureCode": null,
    "currentRetry": 0,
    "maxRetries": 3
  },
  "retryable": false,
  "metrics": {
    "totalOperations": 8,
    "avgDuration": 2500,
    "successRate": 87,
    "operationBreakdown": {
      "text_extraction": 3,
      "table_extraction": 2,
      "virus_scan": 1,
      "ai_analysis": 2
    }
  }
}
```

### 3. Frontend Hook: `useDocumentStatus`

Comprehensive status management with polling and realtime updates:

```typescript
const {
  status,              // Full status data
  isLoading,           // Initial load state
  error,              // Query errors
  retry,              // Retry mutation function
  isRetrying,         // Retry in progress
  realtimeConnected,  // Realtime connection status
  
  // Computed values
  isProcessing,       // Currently processing
  isRetryable,        // Can retry now
  progressPercentage, // 0-100 progress
  currentStep,        // Human-readable step
  hasError,           // Failed status
  errorCode,          // Machine-readable error
  errorMessage,       // Human-readable error
  tableCount,         // Tables extracted
  metrics            // Performance data
} = useDocumentStatus(documentId, {
  enableRealtime: true,
  pollingInterval: 2000,
  maxBackoffDelay: 30000
});
```

**Smart Polling Strategy:**
1. **Active Polling**: 2s interval for active processing
2. **Exponential Backoff**: Increases to 30s for long operations
3. **Realtime Switch**: Stops polling when realtime connects
4. **Completion Stop**: Stops polling for final states

### 4. UI Components

#### `<DocumentStatusBar />`
Visual progress stepper with animations:

```typescript
<DocumentStatusBar
  status="extracting"
  progress={45}
  step="Text Extraction"
  lastUpdated="2024-01-01T12:00:00Z"
/>
```

**Features:**
- 6-step visual progress indicator
- Animated transitions between states
- Color-coded status (success/warning/error)
- Loading spinners for active steps
- Responsive design for mobile/desktop

#### `<DocumentActions />`
Retry controls and error handling:

```typescript
<DocumentActions
  isRetryable={true}
  isRetrying={false}
  onRetry={() => retry()}
  retryCount={1}
  maxRetries={3}
  errorCode="ai_quota_exceeded"
  errorMessage="Daily quota exceeded"
  documentId="uuid"
/>
```

**Features:**
- Smart retry button with countdown
- Error code translation to user messages
- Retry attempt tracking
- Direct link to processing logs
- Maximum retry enforcement

#### `<DocumentMetricsPanel />`
Performance metrics dashboard:

```typescript
<DocumentMetricsPanel
  metrics={metricsData}
  tableCount={3}
  processingTimeMs={15000}
  confidence={0.85}
  pagesProcessed={8}
  totalPages={10}
/>
```

**Displays:**
- Processing time breakdown
- Success rates and confidence scores
- Table extraction results
- Operation statistics
- Performance warnings

### 5. Realtime Integration

#### Supabase Realtime Setup
```sql
-- Enable realtime on extraction table
ALTER TABLE document_extractions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE document_extractions;
```

#### Frontend Subscription
```typescript
const channel = supabase
  .channel(`doc:${documentId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public', 
    table: 'document_extractions',
    filter: `document_id=eq.${documentId}`
  }, (payload) => {
    // Handle realtime updates
    queryClient.invalidateQueries(['document-status', documentId]);
    showStatusChangeToast(payload.new.status_v2);
  })
  .subscribe();
```

#### Security (RLS)
- Channel names include document ID for isolation
- RLS policies ensure users only see their documents
- Service role bypass for system operations

### 6. Error Handling & User Messages

#### Error Code Mapping
```typescript
const errorMessages = {
  'virus_detected': 'File contains malicious content',
  'file_too_large': 'File exceeds size limits', 
  'unsupported_format': 'File format not supported',
  'extraction_timeout': 'Processing timed out',
  'ai_quota_exceeded': 'AI service quota exceeded',
  'network_error': 'Network connection failed'
};
```

#### Toast Notifications
Automatic notifications for status changes:
- **Processing Steps**: "Extracting content...", "Running AI analysis..."
- **Success**: "Processing completed successfully!"
- **Failures**: Specific error messages with suggested actions
- **Retries**: "Retry scheduled for 5 minutes"

### 7. Database Functions

#### `update_extraction_status()`
Centralized status updates with automatic timestamps:

```sql
SELECT update_extraction_status(
  p_extraction_id := 'uuid',
  p_status := 'extracting'::extraction_status_enum,
  p_failure_code := NULL,
  p_failure_detail := NULL,
  p_progress_metadata := '{"pages_processed": 5, "total_pages": 10}'::jsonb
);
```

#### `increment_retry_count()`
Smart retry management with backoff calculation:

```sql
SELECT increment_retry_count(
  p_extraction_id := 'uuid',
  p_backoff_seconds := 300  -- 5 minutes
);
```

### 8. Testing Strategy

#### Unit Tests
- **Hook Logic**: State transitions, polling behavior, realtime handling
- **Component Rendering**: Status display, retry buttons, progress bars
- **API Integration**: Request/response handling, error cases

#### Integration Tests  
- **Status Flow**: Complete processing pipeline simulation
- **Retry Logic**: Backoff timing, retry limits, failure recovery
- **Realtime**: Connection handling, message processing

#### E2E Tests
- **User Journey**: Upload → Processing → Completion/Failure → Retry
- **UI Interactions**: Button clicks, progress updates, toast notifications
- **Error Scenarios**: Network failures, quota limits, file rejections

### 9. Performance Considerations

#### Polling Optimization
- **Smart Intervals**: Adaptive polling based on processing stage
- **Connection Management**: Automatic fallback to polling if realtime fails
- **Resource Cleanup**: Proper subscription cleanup on unmount

#### Realtime Efficiency
- **Filtered Subscriptions**: Document-specific channels to reduce noise
- **Selective Updates**: Only invalidate affected queries
- **Connection Pooling**: Reuse connections where possible

#### Database Optimization
- **Indexed Queries**: Efficient status and retry lookups
- **Function Performance**: Optimized SQL for status updates
- **Connection Management**: Proper pooling for high concurrency

### 10. Monitoring & Observability

#### Metrics Tracking
- **Processing Times**: Per-step duration measurements
- **Retry Rates**: Success/failure rates after retries
- **User Engagement**: How often users check status
- **Error Patterns**: Common failure points and causes

#### Logging
- **Status Changes**: All transitions logged with context
- **Retry Attempts**: Detailed retry attempt logging
- **Performance**: Query times, API response times
- **Errors**: Full error context for debugging

#### Alerts
- **High Retry Rates**: Alert if retry rates exceed thresholds
- **Processing Delays**: Alert for unusually long processing times
- **Realtime Issues**: Alert for subscription failures
- **Quota Limits**: Alert approaching API quotas

### 11. Configuration

#### Environment Variables
```env
# Retry settings
MAX_RETRIES=3
BASE_BACKOFF_SECONDS=300
MAX_BACKOFF_SECONDS=3600

# Polling settings  
POLLING_INTERVAL_MS=2000
MAX_POLLING_BACKOFF_MS=30000

# Realtime settings
REALTIME_TIMEOUT_MS=10000
```

#### Feature Flags
- `ENABLE_REALTIME_STATUS`: Toggle realtime vs polling only
- `ENABLE_RETRY_UI`: Show/hide retry functionality
- `ENABLE_METRICS_PANEL`: Show detailed performance metrics

### 12. Future Enhancements

#### Planned Features
- **Batch Status**: Status for multiple documents
- **Webhooks**: External status notifications
- **Custom Retry Policies**: Per-user retry configurations
- **Advanced Metrics**: ML-powered processing predictions

#### Scaling Considerations
- **Channel Optimization**: Document grouping for large users
- **Caching**: Redis for frequently accessed status data
- **Load Balancing**: Multiple edge function instances
- **Database Sharding**: Partition by user/organization

## Usage Examples

### Basic Status Monitoring
```typescript
function DocumentStatus({ documentId }: { documentId: string }) {
  const { 
    status, 
    isProcessing, 
    progressPercentage, 
    currentStep,
    retry,
    isRetryable 
  } = useDocumentStatus(documentId);

  return (
    <div className="space-y-4">
      <DocumentStatusBar
        status={status?.extraction?.status || 'uploading'}
        progress={progressPercentage}
        step={currentStep}
      />
      
      {isRetryable && (
        <Button onClick={retry}>
          Retry Processing
        </Button>
      )}
    </div>
  );
}
```

### Advanced Dashboard
```typescript
function DocumentDashboard({ documentId }: { documentId: string }) {
  const { status, metrics, tableCount, hasError } = useDocumentStatus(documentId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <DocumentStatusBar {...status?.extraction} />
      
      <DocumentActions
        {...status?.extraction}
        documentId={documentId}
      />
      
      <DocumentMetricsPanel
        metrics={metrics}
        tableCount={tableCount}
        {...status?.extraction}
      />
      
      {hasError && (
        <ErrorRecoveryPanel {...status?.extraction} />
      )}
    </div>
  );
}
```

This comprehensive system provides real-time visibility into document processing with intelligent retry mechanisms and rich user feedback.