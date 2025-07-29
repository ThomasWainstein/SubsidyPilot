import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Play, 
  Brain, 
  Database, 
  Settings, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Rocket,
  BarChart3
} from 'lucide-react';
import { 
  useTrainingJobs,
  useExtractTrainingData,
  usePreprocessData,
  useTriggerTraining,
  useDeployModel,
  type TrainingConfig
} from '@/hooks/useTrainingPipeline';
import { formatDistanceToNow } from 'date-fns';

interface TrainingPipelineManagerProps {
  farmId: string;
}

const TrainingPipelineManager = ({ farmId }: TrainingPipelineManagerProps) => {
  const [extractionParams, setExtractionParams] = useState({
    sinceDate: '',
    maxRecords: 1000
  });
  
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    learning_rate: 2e-5,
    batch_size: 8,
    epochs: 3,
    validation_split: 0.2,
    model_type: 'layoutlm-v3'
  });

  const [extractedData, setExtractedData] = useState<any>(null);
  const [preprocessedData, setPreprocessedData] = useState<any>(null);

  const { data: trainingJobs = [], isLoading: jobsLoading } = useTrainingJobs(farmId);
  const extractMutation = useExtractTrainingData();
  const preprocessMutation = usePreprocessData();
  const triggerMutation = useTriggerTraining();
  const deployMutation = useDeployModel();

  const handleExtractData = async () => {
    try {
      const result = await extractMutation.mutateAsync({
        farmId,
        sinceDate: extractionParams.sinceDate || undefined,
        maxRecords: extractionParams.maxRecords
      });
      setExtractedData(result);
    } catch (error) {
      console.error('Extraction failed:', error);
    }
  };

  const handlePreprocessData = async () => {
    if (!extractedData?.dataset) return;
    
    try {
      const result = await preprocessMutation.mutateAsync({
        dataset: extractedData.dataset,
        targetFormat: 'bio_tagging'
      });
      setPreprocessedData(result);
    } catch (error) {
      console.error('Preprocessing failed:', error);
    }
  };

  const handleTriggerTraining = async () => {
    if (!preprocessedData?.preprocessed_data) return;
    
    try {
      await triggerMutation.mutateAsync({
        trainingData: preprocessedData.preprocessed_data,
        trainingConfig,
        farmId
      });
      
      // Reset pipeline state
      setExtractedData(null);
      setPreprocessedData(null);
    } catch (error) {
      console.error('Training trigger failed:', error);
    }
  };

  const handleDeployModel = async (trainingJobId: string) => {
    try {
      await deployMutation.mutateAsync({
        trainingJobId,
        environment: 'production'
      });
    } catch (error) {
      console.error('Deployment failed:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Pipeline Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Training Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Data Extraction */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-medium">Step 1: Extract Training Data</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Since Date (optional)</label>
                <Input
                  type="date"
                  value={extractionParams.sinceDate}
                  onChange={(e) => setExtractionParams(prev => ({
                    ...prev,
                    sinceDate: e.target.value
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max Records</label>
                <Input
                  type="number"
                  value={extractionParams.maxRecords}
                  onChange={(e) => setExtractionParams(prev => ({
                    ...prev,
                    maxRecords: parseInt(e.target.value) || 1000
                  }))}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={handleExtractData}
                  disabled={extractMutation.isPending}
                  className="w-full"
                >
                  {extractMutation.isPending ? 'Extracting...' : 'Extract Data'}
                </Button>
              </div>
            </div>
            
            {extractedData && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  ✅ Extracted {extractedData.dataset.length} training samples 
                  ({extractedData.quality_issues.length} quality issues)
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Step 2: Data Preprocessing */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-medium">Step 2: Preprocess Data</h3>
            </div>
            
            <Button 
              onClick={handlePreprocessData}
              disabled={!extractedData || preprocessMutation.isPending}
              variant={extractedData ? 'default' : 'outline'}
            >
              {preprocessMutation.isPending ? 'Preprocessing...' : 'Preprocess Data'}
            </Button>
            
            {preprocessedData && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  ✅ Preprocessed {preprocessedData.preprocessed_data.length} samples 
                  ({preprocessedData.metadata.entity_types.length} entity types)
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Step 3: Training Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium">Step 3: Configure & Start Training</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Learning Rate</label>
                <Input
                  type="number"
                  step="0.00001"
                  value={trainingConfig.learning_rate}
                  onChange={(e) => setTrainingConfig(prev => ({
                    ...prev,
                    learning_rate: parseFloat(e.target.value)
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Batch Size</label>
                <Select 
                  value={trainingConfig.batch_size?.toString()} 
                  onValueChange={(value) => setTrainingConfig(prev => ({
                    ...prev,
                    batch_size: parseInt(value)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="8">8</SelectItem>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="32">32</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Epochs</label>
                <Select 
                  value={trainingConfig.epochs?.toString()} 
                  onValueChange={(value) => setTrainingConfig(prev => ({
                    ...prev,
                    epochs: parseInt(value)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Validation Split</label>
                <Select 
                  value={trainingConfig.validation_split?.toString()} 
                  onValueChange={(value) => setTrainingConfig(prev => ({
                    ...prev,
                    validation_split: parseFloat(value)
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.1">10%</SelectItem>
                    <SelectItem value="0.2">20%</SelectItem>
                    <SelectItem value="0.3">30%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleTriggerTraining}
              disabled={!preprocessedData || triggerMutation.isPending}
              variant={preprocessedData ? 'default' : 'outline'}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              {triggerMutation.isPending ? 'Starting Training...' : 'Start Training'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Training Jobs History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Training Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : trainingJobs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              No training jobs found. Start your first training above.
            </div>
          ) : (
            <div className="space-y-4">
              {trainingJobs.map((job) => (
                <div key={job.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className="font-medium">{job.model_type}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(job.status)}`}
                      >
                        {job.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {job.status === 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => handleDeployModel(job.id)}
                          disabled={deployMutation.isPending}
                        >
                          <Rocket className="h-4 w-4 mr-1" />
                          Deploy
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Dataset Size:</span> {job.dataset_size}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span> {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                    </div>
                    {job.completed_at && (
                      <div>
                        <span className="font-medium">Completed:</span> {formatDistanceToNow(new Date(job.completed_at), { addSuffix: true })}
                      </div>
                    )}
                    {job.metrics && (
                      <div>
                        <span className="font-medium">F1 Score:</span> {(job.metrics.validation_f1 * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                  
                  {job.error_message && (
                    <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                      {job.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TrainingPipelineManager;