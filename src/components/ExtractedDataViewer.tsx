import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Eye, FileText, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ExtractedDataViewerProps {
  documentId: string;
  autoRefresh?: boolean;  // Add prop to trigger refresh
}

export function ExtractedDataViewer({ documentId, autoRefresh = false }: ExtractedDataViewerProps) {
  const [extractedData, setExtractedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [confidence, setConfidence] = useState<number>(0);
  const [modelUsed, setModelUsed] = useState<string>('');

  const fetchExtractedData = async () => {
    if (!documentId) return;
    
    console.log(`🔍 [ExtractedDataViewer] Fetching data for document: ${documentId}`);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_extractions')
        .select('extracted_data, confidence_score, model_used, processing_time_ms')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log(`🔍 [ExtractedDataViewer] Query result:`, { data, error });

      if (error) {
        console.error('❌ [ExtractedDataViewer] Error fetching extracted data:', error);
        return;
      }

      if (data) {
        console.log(`✅ [ExtractedDataViewer] Data found:`, data);
        setExtractedData(data.extracted_data);
        setConfidence((data.confidence_score || 0) * 100);
        setModelUsed(data.model_used || 'AI Enhanced');
        
        // Auto-open when data is available for the first time
        if (data.extracted_data && !isOpen) {
          console.log(`🔓 [ExtractedDataViewer] Auto-opening data viewer`);
          setIsOpen(true);
        }
      } else {
        console.log(`⚠️ [ExtractedDataViewer] No data returned from query`);
      }
    } catch (err) {
      console.error('❌ [ExtractedDataViewer] Failed to fetch extracted data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtractedData();
  }, [documentId]);

  // Add periodic refresh when autoRefresh is enabled
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchExtractedData, 2000); // Poll every 2 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getActualExtractedFields = (data: any) => {
    // Handle nested structure from streaming pipeline - check for fields first
    if (data?.fields) {
      return data.fields;
    }
    // Handle legacy extracted_fields structure
    if (data?.extracted_fields) {
      return data.extracted_fields;
    }
    // Handle direct structure
    if (data && typeof data === 'object') {
      return data;
    }
    return {};
  };

  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    
    // Handle nested extraction format with value/confidence/source_snippet
    if (typeof value === 'object' && value.value !== undefined) {
      return String(value.value);
    }
    
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

  const actualFields = getActualExtractedFields(extractedData);
  const dataFields = typeof actualFields === 'object' ? Object.entries(actualFields) : [];
  
  const isProtectedDocument = dataFields.length <= 3 && 
    dataFields.some(([key]) => key === 'content' || key === 'title') &&
    !dataFields.some(([key, value]) => 
      key.toLowerCase().includes('amount') || 
      key.toLowerCase().includes('date') ||
      key.toLowerCase().includes('name') ||
      key.toLowerCase().includes('address')
    );

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
            {isProtectedDocument && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <span className="text-lg">🔒</span>
                  <span className="font-medium">Protected Document Detected</span>
                </div>
                <p className="text-sm text-amber-700 mb-3">
                  This PDF appears to be password-protected or has restricted text extraction. 
                  The system processed it but could only extract basic metadata.
                </p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-amber-800 font-medium hover:text-amber-900">
                    Solutions for protected PDFs
                  </summary>
                  <div className="mt-2 space-y-2 text-amber-700">
                    <p>• <strong>Convert to unprotected PDF:</strong> Use PDF tools to remove restrictions</p>
                    <p>• <strong>Print to PDF:</strong> Open the document and print as a new PDF</p>
                    <p>• <strong>OCR processing:</strong> Enable enhanced OCR in processing settings</p>
                    <p>• <strong>Image extraction:</strong> Convert pages to images first</p>
                  </div>
                </details>
              </div>
            )}
            
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
                {isProtectedDocument && (
                  <span className="text-amber-600 block mt-1">
                    <strong>Note:</strong> This document appears to be protected, limiting text extraction capabilities.
                  </span>
                )}
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}