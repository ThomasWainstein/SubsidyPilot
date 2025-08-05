import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Database, TrendingUp, Rocket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrainingPipelineTabProps {
  farmId: string;
}

const TrainingPipelineTab = ({ farmId }: TrainingPipelineTabProps) => {
  const navigate = useNavigate();

  const handleOpenTrainingPipeline = () => {
    navigate(`/farm/${farmId}/training`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Model Training Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Continuously improve extraction accuracy by training models with human-corrected data from your document reviews.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Database className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-medium">Data Extraction</h3>
                <p className="text-sm text-muted-foreground">Gather review corrections</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-medium">Model Training</h3>
                <p className="text-sm text-muted-foreground">Fine-tune transformers</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Rocket className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="font-medium">Deployment</h3>
                <p className="text-sm text-muted-foreground">Auto-deploy improvements</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Brain className="h-8 w-8 text-orange-500" />
              <div>
                <h3 className="font-medium">Feedback Loop</h3>
                <p className="text-sm text-muted-foreground">Continuous learning</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Training Pipeline Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Automated data extraction from human corrections</li>
              <li>• Quality validation and preprocessing</li>
              <li>• LayoutLM and transformer fine-tuning</li>
              <li>• Model versioning and deployment</li>
              <li>• Performance monitoring and rollback</li>
            </ul>
          </div>
          
          <Button onClick={handleOpenTrainingPipeline} className="w-full">
            Open Training Pipeline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPipelineTab;