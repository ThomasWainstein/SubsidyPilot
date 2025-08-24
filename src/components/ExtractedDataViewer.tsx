import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Eye, FileText, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedDataViewerProps {
  documentId: string;
}

export function ExtractedDataViewer({ documentId }: ExtractedDataViewerProps) {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [modelUsed, setModelUsed] = useState<string>('');

  const fetchExtractedData = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('extracted_data, confidence_score, model_used, processing_time_ms')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching extracted data:', error);
        return;
      }

      if (data) {
        setExtractedData(data.extracted_data);
        setConfidence((data.confidence_score || 0) * 100);
        setModelUsed(data.model_used || 'AI Enhanced');
      }
    } catch (err) {
      console.error('Failed to fetch extracted data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtractedData();
  }, [documentId]);

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const getFieldIcon = (key: string) => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('date') || lowerKey.includes('time')) return '📅';
    if (lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('cost')) return '💰';
    if (lowerKey.includes('name') || lowerKey.includes('title')) return '👤';
    if (lowerKey.includes('address') || lowerKey.includes('location')) return '📍';
    if (lowerKey.includes('phone') || lowerKey.includes('tel')) return '📞';
    if (lowerKey.includes('email') || lowerKey.includes('mail')) return '✉️';
    return '📄';
  };

  if (!extractedData) {
    return (
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="text-sm">No extracted data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dataFields = typeof extractedData === 'object' ? Object.entries(extractedData) : [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-primary/20">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">View Extracted Data</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {dataFields.length} fields
                </Badge>
                {confidence > 0 && (
                  <Badge variant={confidence > 80 ? 'default' : 'secondary'} className="ml-1">
                    {confidence.toFixed(0)}% confidence
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {modelUsed && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {modelUsed}
                  </div>
                )}
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {dataFields.length > 0 ? (
              <div className="space-y-3">
                {dataFields.map(([key, value], index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="text-lg">{getFieldIcon(key)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-muted-foreground break-words">
                        {formatValue(key, value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No structured data extracted</p>
              </div>
            )}
            
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <strong>Why AI was used:</strong> Document extraction requires intelligent parsing to identify 
                and structure information from unstructured documents. AI helps recognize patterns, 
                extract relevant fields, and handle various document formats automatically.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}