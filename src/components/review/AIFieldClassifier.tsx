import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  AlertTriangle, 
  Check, 
  X, 
  Bot,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AIFieldClassifierProps {
  unmappedData: Record<string, any>;
  onClassify: (classifiedFields: any[]) => void;
  isProcessing: boolean;
}

interface ClassifiedField {
  originalKey: string;
  suggestedFieldName: string;
  value: any;
  confidence: number;
  accepted: boolean;
}

const AIFieldClassifier: React.FC<AIFieldClassifierProps> = ({
  unmappedData,
  onClassify,
  isProcessing
}) => {
  const [classifiedFields, setClassifiedFields] = useState<ClassifiedField[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [customFieldNames, setCustomFieldNames] = useState<Record<string, string>>({});

  const runAIClassification = async () => {
    setIsClassifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('classify-extracted-fields', {
        body: {
          unmappedData: unmappedData
        }
      });

      if (error) throw error;

      const classified: ClassifiedField[] = data.classifications.map((item: any) => ({
        originalKey: item.originalKey,
        suggestedFieldName: item.suggestedFieldName,
        value: item.value,
        confidence: item.confidence,
        accepted: item.confidence > 0.7 // Auto-accept high confidence
      }));

      setClassifiedFields(classified);
      
      toast({
        title: 'AI Classification Complete',
        description: `Classified ${classified.length} unmapped fields`,
      });
    } catch (error) {
      console.error('AI Classification failed:', error);
      toast({
        title: 'Classification Failed',
        description: 'Could not classify fields automatically',
        variant: 'destructive',
      });
    } finally {
      setIsClassifying(false);
    }
  };

  const toggleFieldAcceptance = (index: number) => {
    setClassifiedFields(prev => prev.map((field, i) => 
      i === index ? { ...field, accepted: !field.accepted } : field
    ));
  };

  const updateFieldName = (index: number, newName: string) => {
    setClassifiedFields(prev => prev.map((field, i) => 
      i === index ? { ...field, suggestedFieldName: newName } : field
    ));
  };

  const updateCustomFieldName = (originalKey: string, customName: string) => {
    setCustomFieldNames(prev => ({
      ...prev,
      [originalKey]: customName
    }));
  };

  const applyClassifications = () => {
    const acceptedFields = classifiedFields
      .filter(field => field.accepted)
      .map(field => ({
        fieldName: field.suggestedFieldName,
        value: field.value,
        confidence: field.confidence
      }));

    // Add custom named fields
    const customFields = Object.keys(customFieldNames)
      .filter(key => customFieldNames[key].trim())
      .map(key => ({
        fieldName: customFieldNames[key],
        value: unmappedData[key],
        confidence: 1.0 // Full confidence for manual naming
      }));

    onClassify([...acceptedFields, ...customFields]);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadge = (confidence: number) => {
    const percentage = Math.round(confidence * 100);
    const variant = confidence >= 0.8 ? 'default' : confidence >= 0.6 ? 'secondary' : 'destructive';
    
    return (
      <Badge variant={variant} className="text-xs">
        {percentage}%
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-600" />
          Unmapped Fields ({Object.keys(unmappedData).length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Use AI to classify unmapped fields or manually assign field names
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Classification Button */}
        {classifiedFields.length === 0 && (
          <Button
            onClick={runAIClassification}
            disabled={isClassifying || isProcessing}
            className="w-full"
          >
            {isClassifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Bot className="h-4 w-4 mr-2" />
            )}
            {isClassifying ? 'Classifying...' : 'Run AI Classification'}
          </Button>
        )}

        {/* AI Classification Results */}
        {classifiedFields.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">AI Suggestions</h4>
              <Button
                onClick={applyClassifications}
                disabled={isProcessing || !classifiedFields.some(f => f.accepted)}
                size="sm"
              >
                Apply Selected ({classifiedFields.filter(f => f.accepted).length})
              </Button>
            </div>
            
            {classifiedFields.map((field, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFieldAcceptance(index)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        field.accepted 
                          ? 'bg-green-600 border-green-600 text-white' 
                          : 'border-gray-300'
                      }`}
                    >
                      {field.accepted && <Check className="h-3 w-3" />}
                    </button>
                    <span className="text-sm font-medium">
                      {field.originalKey} → {field.suggestedFieldName}
                    </span>
                  </div>
                  {getConfidenceBadge(field.confidence)}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Suggested Field Name</Label>
                    <Input
                      value={field.suggestedFieldName}
                      onChange={(e) => updateFieldName(index, e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Value</Label>
                    <div className="h-8 px-3 py-1 border rounded text-sm bg-muted truncate">
                      {Array.isArray(field.value) ? field.value.join(', ') : String(field.value)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manual Field Naming */}
        <div className="space-y-3">
          <h4 className="font-medium">Manual Classification</h4>
          {Object.keys(unmappedData).map(key => (
            <div key={key} className="border rounded-lg p-3 space-y-2">
              <div className="text-sm font-medium text-muted-foreground">
                Original: {key}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Field Name</Label>
                  <Input
                    placeholder="Enter field name..."
                    value={customFieldNames[key] || ''}
                    onChange={(e) => updateCustomFieldName(key, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Value</Label>
                  <div className="h-8 px-3 py-1 border rounded text-sm bg-muted truncate">
                    {Array.isArray(unmappedData[key]) 
                      ? unmappedData[key].join(', ') 
                      : String(unmappedData[key])
                    }
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Apply Custom Fields */}
        {Object.values(customFieldNames).some(name => name.trim()) && (
          <Button
            onClick={applyClassifications}
            disabled={isProcessing}
            variant="outline"
            className="w-full"
          >
            Apply Custom Field Names
          </Button>
        )}

        {Object.keys(unmappedData).length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No unmapped fields to classify</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIFieldClassifier;