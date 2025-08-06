import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EnhancedExtractionTriggerProps {
  subsidyUrl: string;
  subsidyTitle: string;
  onSuccess?: () => void;
}

export const EnhancedExtractionTrigger: React.FC<EnhancedExtractionTriggerProps> = ({
  subsidyUrl,
  subsidyTitle,
  onSuccess
}) => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [extractionStats, setExtractionStats] = useState<any>(null);

  const triggerEnhancedExtraction = async () => {
    if (!subsidyUrl) {
      toast.error('No URL available for extraction');
      return;
    }

    setIsExtracting(true);
    setExtractionStatus('processing');
    
    try {
      console.log('🚀 Triggering enhanced FranceAgriMer extraction for:', subsidyUrl);
      
      const { data, error } = await supabase.functions.invoke('enhanced-franceagrimer-extraction', {
        body: {
          url: subsidyUrl,
          forceReprocess: true
        }
      });

      if (error) {
        console.error('❌ Enhanced extraction error:', error);
        throw new Error(error.message || 'Enhanced extraction failed');
      }

      console.log('✅ Enhanced extraction response:', data);
      
      if (data.success) {
        setExtractionStatus('success');
        setExtractionStats(data.stats);
        toast.success(`Enhanced extraction completed! Found ${data.stats?.sections_found || 0} sections and ${data.stats?.documents_found || 0} documents`);
        
        // Refresh the page data
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(data.error || 'Enhanced extraction failed');
      }
      
    } catch (error) {
      console.error('❌ Enhanced extraction failed:', error);
      setExtractionStatus('error');
      toast.error(`Enhanced extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const getStatusIcon = () => {
    switch (extractionStatus) {
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (extractionStatus) {
      case 'processing':
        return 'Processing enhanced extraction...';
      case 'success':
        return 'Enhanced extraction completed successfully!';
      case 'error':
        return 'Enhanced extraction failed';
      default:
        return 'Ready for enhanced extraction';
    }
  };

  const getStatusColor = () => {
    switch (extractionStatus) {
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Enhanced Data Extraction</CardTitle>
          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
            AI-Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            Current data appears incomplete. Use enhanced extraction to capture:
          </p>
          <ul className="text-xs space-y-1 ml-4 list-disc">
            <li>Complete presentation and objectives</li>
            <li>Detailed application process steps</li>
            <li>All downloadable documents with metadata</li>
            <li>Contact information and deadlines</li>
            <li>Full eligibility criteria and requirements</li>
            <li>Funding details and payment terms</li>
          </ul>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-white border">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
          <Badge className={`ml-auto text-xs ${getStatusColor()}`}>
            {extractionStatus.toUpperCase()}
          </Badge>
        </div>

        {extractionStats && extractionStatus === 'success' && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{extractionStats.sections_found || 0}</div>
              <div className="text-xs text-green-600">Sections</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{extractionStats.documents_found || 0}</div>
              <div className="text-xs text-green-600">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-700">{extractionStats.completeness_score || 0}%</div>
              <div className="text-xs text-green-600">Complete</div>
            </div>
          </div>
        )}

        <Button 
          onClick={triggerEnhancedExtraction}
          disabled={isExtracting}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Enhanced Extraction...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Run Enhanced Extraction
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground text-center">
          This will extract comprehensive data from the source page using advanced AI processing
        </div>
      </CardContent>
    </Card>
  );
};