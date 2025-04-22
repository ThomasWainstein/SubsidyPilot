
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subsidies, Subsidy } from '@/data/subsidies';
import DropzoneUpload from '@/components/document/DropzoneUpload';

interface SimulationUploadProps {
  onShowResults: (subsidies: Subsidy[]) => void;
}

const SimulationUpload = ({ onShowResults }: SimulationUploadProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<Record<string, string> | null>(null);
  
  const handleUpload = (files: File[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    setIsUploading(true);
    
    // Simulate upload progress
    let uploadProgress = 0;
    const uploadInterval = setInterval(() => {
      uploadProgress += 10;
      setProgress(uploadProgress);
      
      if (uploadProgress >= 100) {
        clearInterval(uploadInterval);
        setIsUploading(false);
        setIsAnalyzing(true);
        
        // Simulate OCR analysis
        setTimeout(() => {
          // Mock extracted data
          setExtractedData({
            'Farm Type': 'Dairy',
            'Location': 'Southwest Romania',
            'Size': '68 hectares',
            'Certifications': 'Organic Transition',
            'Farming Method': 'Conventional to Organic'
          });
          
          toast({
            title: t('messages.documentAnalyzed'),
            description: t('messages.documentAnalyzedDesc'),
          });
          
          setIsAnalyzing(false);
        }, 3000);
      }
    }, 300);
  };
  
  const handleProcessResults = () => {
    // Randomly select 2-4 subsidies
    const shuffled = [...subsidies].sort(() => 0.5 - Math.random());
    const matchingSubsidies = shuffled.slice(0, Math.floor(Math.random() * 3) + 2); // 2 to 4 subsidies
    
    // Adjust match confidence based on extracted data
    const adjustedSubsidies = matchingSubsidies.map(subsidy => {
      const confidence = Math.floor(Math.random() * 30) + 70; // 70-99
      return {
        ...subsidy,
        matchConfidence: confidence
      };
    });
    
    onShowResults(adjustedSubsidies);
  };

  return (
    <div className="space-y-6">
      {!isUploading && !isAnalyzing && !extractedData && (
        <DropzoneUpload 
          onFilesSelected={handleUpload}
          maxFiles={1}
          accept={{ 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] }}
          title={t('simulation.upload.heading')}
          description={t('simulation.upload.dragDrop')}
        />
      )}
      
      {isUploading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center text-sm text-gray-500">
              <Upload className="h-4 w-4 mr-2" />
              {t('messages.uploading')}...
            </span>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>
      )}
      
      {isAnalyzing && (
        <div className="space-y-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center flex-col space-y-4">
                <FileText className="h-10 w-10 text-yellow-600 animate-pulse" />
                <h3 className="font-medium text-yellow-800">{t('simulation.upload.analyzing')}</h3>
                <p className="text-sm text-yellow-700">{t('messages.scanningDocument')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {extractedData && (
        <div className="space-y-4">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-center flex-col space-y-2">
                <CheckCircle className="h-10 w-10 text-green-600" />
                <h3 className="font-medium text-green-800">{t('simulation.upload.complete')}</h3>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-4">{t('simulation.upload.extractedInfo')}</h3>
            <dl className="divide-y divide-gray-200">
              {Object.entries(extractedData).map(([key, value]) => (
                <div key={key} className="py-3 grid grid-cols-3">
                  <dt className="text-sm font-medium text-gray-500">{key}</dt>
                  <dd className="text-sm text-gray-900 col-span-2">{value}</dd>
                </div>
              ))}
            </dl>
            
            <Button onClick={handleProcessResults} className="w-full mt-6">
              {t('simulation.form.submit')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationUpload;
