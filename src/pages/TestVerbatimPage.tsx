import React from 'react';
import VerbatimExtractionTest from '@/components/test/VerbatimExtractionTest';

const TestVerbatimPage: React.FC = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Enhanced Verbatim Content Extraction Test</h1>
        <p className="text-muted-foreground mt-2">
          Test the new system to extract authentic French government content and documents
        </p>
      </div>
      
      <VerbatimExtractionTest />
    </div>
  );
};

export default TestVerbatimPage;