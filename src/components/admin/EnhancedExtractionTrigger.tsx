import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { prodLogger } from '@/utils/productionLogger';

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
      prodLogger.debug('🚀 Triggering enhanced FranceAgriMer extraction for:', subsidyUrl);
      
      const { data, error } = await supabase.functions.invoke('enhanced-franceagrimer-extraction', {
        body: {
          url: subsidyUrl,
          forceReprocess: true
        }
      });

      if (error) {
        prodLogger.error('❌ Enhanced extraction error:', error);
        throw new Error(error.message || 'Enhanced extraction failed');
      }

      prodLogger.debug('✅ Enhanced extraction response:', data);
      
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
    <div className="bg-card rounded-lg border border-border p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Enhanced Data Extraction</h3>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          AI-Powered
        </Badge>
      </div>

      {/* Description */}
      <div className="text-sm text-muted-foreground">
        <p className="mb-3">
          Current data appears incomplete. Use enhanced extraction to capture:
        </p>
        <ul className="space-y-1 ml-2 text-xs">
          <li>• Complete presentation and objectives</li>
          <li>• Detailed application process steps</li>
          <li>• All downloadable documents with metadata</li>
          <li>• Contact information and deadlines</li>
          <li>• Full eligibility criteria and requirements</li>
          <li>• Funding details and payment terms</li>
        </ul>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
        {getStatusIcon()}
        <span className="text-sm font-medium flex-1">{getStatusText()}</span>
        <Badge className={`text-xs px-2 py-1 ${
          extractionStatus === 'idle' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' : 
          extractionStatus === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
          extractionStatus === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        }`}>
          {extractionStatus.toUpperCase()}
        </Badge>
      </div>

      {/* Success Stats */}
      {extractionStats && extractionStatus === 'success' && (
        <div className="grid grid-cols-3 gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-center">
            <div className="text-lg font-bold text-green-700 dark:text-green-300">{extractionStats.sections_found || 0}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Sections</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-700 dark:text-green-300">{extractionStats.documents_found || 0}</div>
            <div className="text-xs text-green-600 dark:text-green-400">Documents</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-700 dark:text-green-300">{extractionStats.completeness_score || 0}%</div>
            <div className="text-xs text-green-600 dark:text-green-400">Complete</div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <Button 
        onClick={triggerEnhancedExtraction}
        disabled={isExtracting}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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

      {/* Footer Text */}
      <p className="text-xs text-muted-foreground text-center">
        This will extract comprehensive data from the source page using advanced AI processing
      </p>
    </div>
  );
};