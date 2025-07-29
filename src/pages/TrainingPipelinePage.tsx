import React from 'react';
import { useParams } from 'react-router-dom';
import TrainingPipelineManager from '@/components/training/TrainingPipelineManager';

const TrainingPipelinePage = () => {
  const { farmId } = useParams<{ farmId: string }>();

  if (!farmId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">Farm not found</h1>
          <p className="text-muted-foreground">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">AI Training Pipeline</h1>
        <p className="text-muted-foreground">
          Train and improve your document extraction models using human corrections
        </p>
      </div>
      <TrainingPipelineManager farmId={farmId} />
    </div>
  );
};

export default TrainingPipelinePage;