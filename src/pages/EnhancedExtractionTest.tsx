import React from 'react';
import EnhancedDocumentUpload from '@/components/extraction/EnhancedDocumentUpload';

const EnhancedExtractionTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8">
        <EnhancedDocumentUpload />
      </main>
    </div>
  );
};

export default EnhancedExtractionTest;