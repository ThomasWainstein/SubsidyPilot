const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  storage: multer.memoryStorage()
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'subsidypilot-form-parser',
    version: '1.0.0'
  });
});

// Service info endpoint
app.get('/info', (req, res) => {
  res.json({
    service: 'subsidypilot-form-parser',
    version: '1.0.0',
    capabilities: ['document-processing', 'ocr', 'ai-extraction'],
    supported_formats: ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'tiff'],
    max_file_size: '50MB',
    processing_timeout: '300s'
  });
});

// Document processing endpoint
app.post('/process-document', upload.single('document'), async (req, res) => {
  try {
    console.log('📄 Processing document request:', {
      body: req.body,
      file: req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'No file'
    });

    // Extract request data
    const {
      document_id,
      file_url,
      file_name,
      document_type = 'general',
      extraction_options = {}
    } = req.body;

    // Validate required fields
    if (!document_id && !req.file) {
      return res.status(400).json({
        error: 'Missing required fields: document_id or file upload required'
      });
    }

    // Simulate processing time (replace with actual AI processing)
    const processingStart = Date.now();
    
    // Mock AI extraction results (replace with real OpenAI/OCR processing)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing

    const extractedData = {
      document_info: {
        file_name: file_name || req.file?.originalname || 'unknown',
        document_type,
        pages: Math.floor(Math.random() * 10) + 1,
        size_bytes: req.file?.size || 0
      },
      extracted_fields: {
        title: `Sample ${document_type} Document`,
        applicant_name: "Thomas Wainstein",
        application_date: new Date().toISOString().split('T')[0],
        amount_requested: Math.floor(Math.random() * 100000) + 10000,
        project_description: `Sample project description for ${document_type}`,
        eligibility_criteria: ["Agricultural activity", "EU citizen", "Valid registration"],
        deadline: "2025-12-31",
        contact_email: "thomaswainstein@gmail.com"
      },
      technical_details: {
        ocr_used: extraction_options.include_ocr !== false,
        tables_extracted: Math.floor(Math.random() * 5),
        confidence_scores: {
          overall: 0.85 + Math.random() * 0.1,
          text_extraction: 0.9 + Math.random() * 0.05,
          field_detection: 0.8 + Math.random() * 0.15
        }
      }
    };

    const processingTime = Date.now() - processingStart;

    console.log(`✅ Document processed successfully in ${processingTime}ms`);

    res.json({
      success: true,
      extracted_data: extractedData,
      confidence_score: extractedData.technical_details.confidence_scores.overall,
      processing_time_ms: processingTime,
      model_used: 'gpt-4o-mini',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Document processing error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Processing failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    available_endpoints: ['/health', '/info', '/process-document'],
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SubsidyPilot Form Parser running on port ${PORT}`);
  console.log(`📍 Health check: /health`);
  console.log(`📊 Service info: /info`);
  console.log(`📄 Document processing: POST /process-document`);
});

module.exports = app;