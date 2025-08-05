# Architecture Overview

AgriTool implements a multi-stage document processing pipeline designed for scalability, reliability, and maintainability.

## System Architecture

### High-Level Components

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[User Interface]
        Upload[Upload Component]
        Review[Review Interface]
        Dashboard[Admin Dashboard]
    end
    
    subgraph "Processing Pipeline"
        Classify[Document Classification]
        Extract[Local Extraction]
        Fallback[Cloud Fallback]
        Review_Q[Review Queue]
    end
    
    subgraph "Backend Services"
        Edge[Edge Functions]
        DB[(Supabase Database)]
        Storage[(File Storage)]
        Training[Training Pipeline]
    end
    
    UI --> Upload
    Upload --> Classify
    Classify --> Extract
    Extract --> Fallback
    Extract --> Review_Q
    Review_Q --> Review
    Review --> DB
    Edge --> Training
```

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **ML/AI**: HuggingFace Transformers.js, OpenAI API
- **Testing**: Vitest, React Testing Library
- **Build**: Vite, ESBuild

## Processing Workflow

### 1. Document Upload and Classification

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Classifier
    participant Storage
    participant DB
    
    User->>UI: Upload Document
    UI->>Storage: Store File
    UI->>Classifier: Classify Document
    Classifier->>Classifier: Rule-based + ML Classification
    Classifier->>DB: Log Classification
    Classifier->>UI: Return Category + Confidence
```

**Key Features:**
- Hybrid classification (rule-based + ML)
- Multiple model support with fallback
- Confidence scoring and logging

### 2. Data Extraction Pipeline

```mermaid
sequenceDiagram
    participant UI
    participant LocalExtractor
    participant CloudExtractor
    participant DB
    
    UI->>LocalExtractor: Extract Data
    LocalExtractor->>LocalExtractor: NER + QA Processing
    LocalExtractor->>LocalExtractor: Calculate Confidence
    
    alt High Confidence
        LocalExtractor->>DB: Store Results
        LocalExtractor->>UI: Return Extracted Data
    else Low Confidence
        LocalExtractor->>CloudExtractor: Fallback to Cloud
        CloudExtractor->>DB: Store Results
        CloudExtractor->>UI: Return Extracted Data
    end
```

**Key Features:**
- Browser-based local processing
- Intelligent fallback mechanisms
- Configurable confidence thresholds
- Multi-model entity extraction

### 3. Human Review System

```mermaid
graph LR
    A[Extraction Complete] --> B{Confidence Check}
    B -->|< 70%| C[Review Queue]
    B -->|>= 70%| D[Auto-Accept]
    C --> E[Human Review]
    E --> F[Corrections Made]
    F --> G[Audit Log]
    D --> G
    G --> H[Training Data]
```

**Key Features:**
- Confidence-based routing
- Comprehensive review interface
- Audit trail for all corrections
- Integration with training pipeline

### 4. Training Pipeline

```mermaid
graph TD
    A[Data Collection] --> B[Preprocessing]
    B --> C[Training Job]
    C --> D[Model Validation]
    D --> E[Deployment]
    E --> F[Production Use]
    
    G[Simulation Mode] -.-> C
    G -.-> E
```

**Key Features:**
- Simulation mode for safe testing
- Automated data preprocessing
- Model validation and metrics
- Staged deployment process

## Data Architecture

### Database Schema

```mermaid
erDiagram
    farms ||--o{ documents : "has"
    documents ||--o{ document_extractions : "has"
    document_extractions ||--o{ document_extraction_reviews : "reviewed_by"
    users ||--o{ document_extraction_reviews : "creates"
    
    farms {
        uuid id PK
        string name
        jsonb metadata
        timestamp created_at
    }
    
    documents {
        uuid id PK
        uuid farm_id FK
        string file_name
        string file_url
        string document_type
        timestamp uploaded_at
    }
    
    document_extractions {
        uuid id PK
        uuid document_id FK
        jsonb extracted_data
        float confidence_score
        string status
        timestamp created_at
    }
    
    document_extraction_reviews {
        uuid id PK
        uuid extraction_id FK
        uuid reviewer_id FK
        jsonb original_data
        jsonb corrected_data
        text reviewer_notes
        timestamp created_at
    }
```

### Security Model

- **Row Level Security (RLS)** on all tables
- **User-based access control** for farm data
- **Audit logging** for all data modifications
- **Encrypted storage** for sensitive documents

## Performance Considerations

### Frontend Optimization
- **Code splitting** for large components
- **Lazy loading** for heavy ML models
- **Browser caching** for model artifacts
- **Optimistic updates** for better UX

### Backend Optimization
- **Database indexing** on frequently queried fields
- **Connection pooling** for database access
- **Edge function caching** for static responses
- **Batch processing** for training operations

### Scaling Strategy
- **Horizontal scaling** via Supabase infrastructure
- **CDN distribution** for static assets
- **Regional deployment** for reduced latency
- **Queue-based processing** for heavy workloads

## Monitoring and Observability

### Logging Strategy
- **Structured logging** with consistent formats
- **Error tracking** with context preservation
- **Performance metrics** for critical paths
- **Security event logging** for audit compliance

### Health Checks
- **Service availability** monitoring
- **Database connectivity** checks
- **ML model availability** validation
- **Storage accessibility** verification

---

*For more detailed information, see the specific architecture documents in this directory.*