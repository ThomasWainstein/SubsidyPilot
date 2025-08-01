import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit3, Check, AlertTriangle, User, Building } from 'lucide-react';

interface PrefillField {
  fieldName: string;
  fieldLabel: string;
  fieldType: string;
  prefilledValue: string | number | boolean | null;
  confidence: number;
  source: 'user_profile' | 'farm_profile' | 'ai_inference' | 'manual_required';
  editable: boolean;
  reasoning: string;
  needsManualInput: boolean;
}

interface AIPrefillDemoProps {
  className?: string;
}

const AIPrefillDemo: React.FC<AIPrefillDemoProps> = ({ className }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [prefillResult, setPrefillResult] = useState<any>(null);
  const [editedFields, setEditedFields] = useState<Record<string, any>>({});
  const [showReview, setShowReview] = useState(false);
  const { toast } = useToast();

  const runAIPrefill = async () => {
    setIsProcessing(true);
    setPrefillResult(null);
    setShowReview(false);
    
    try {
      console.log('🤖 Starting AI prefill demo...');
      
      // First get a farm and schema for testing
      const { data: farms, error: farmError } = await supabase
        .from('farms')
        .select('*')
        .limit(1);

      if (farmError || !farms || farms.length === 0) {
        throw new Error('No test farm found. Please create a farm profile first.');
      }

      const { data: schemas, error: schemaError } = await supabase
        .from('subsidy_form_schemas')
        .select('*')
        .limit(1);

      if (schemaError || !schemas || schemas.length === 0) {
        throw new Error('No form schema found. Please run schema extraction first.');
      }

      toast({
        title: "Starting AI Prefill",
        description: `Using farm: ${farms[0].name} with schema: ${typeof schemas[0].schema === 'object' && schemas[0].schema ? (schemas[0].schema as any).documentTitle : 'Unknown'}`
      });

      const { data, error } = await supabase.functions.invoke('ai-prefill-form', {
        body: { 
          farmId: farms[0].id,
          schemaId: schemas[0].id,
          action: 'prefill_form'
        }
      });

      if (error) {
        throw new Error(`AI prefill failed: ${error.message}`);
      }

      console.log('✅ AI prefill completed:', data);
      setPrefillResult(data.prefillResult);
      setShowReview(true);

      toast({
        title: "AI Prefill Complete",
        description: `Prefilled ${data.prefillResult?.prefilledFields || 0}/${data.prefillResult?.totalFields || 0} fields`
      });

    } catch (error) {
      console.error('❌ AI prefill failed:', error);
      toast({
        title: "Prefill Failed",
        description: error.message || "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFieldEdit = (fieldName: string, newValue: any) => {
    setEditedFields(prev => ({
      ...prev,
      [fieldName]: newValue
    }));
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (confidence >= 40) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'user_profile': return <User className="w-3 h-3" />;
      case 'farm_profile': return <Building className="w-3 h-3" />;
      case 'ai_inference': return <div className="w-3 h-3 bg-blue-500 rounded-full" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const renderField = (field: PrefillField) => {
    const currentValue = editedFields[field.fieldName] ?? field.prefilledValue;
    const isEdited = field.fieldName in editedFields;

    return (
      <div key={field.fieldName} className="space-y-3 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center justify-between">
          <Label className="font-medium">{field.fieldLabel}</Label>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getConfidenceColor(field.confidence)}`}>
              {field.confidence}%
            </Badge>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getSourceIcon(field.source)}
              <span>{field.source.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {field.fieldType === 'textarea' ? (
            <Textarea
              value={currentValue || ''}
              onChange={(e) => handleFieldEdit(field.fieldName, e.target.value)}
              placeholder={field.needsManualInput ? 'Manual input required' : ''}
              className={isEdited ? 'border-blue-500 bg-blue-50' : ''}
            />
          ) : field.fieldType === 'checkbox' ? (
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={currentValue === true}
                onChange={(e) => handleFieldEdit(field.fieldName, e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Yes/Oui</span>
            </div>
          ) : (
            <Input
              type={field.fieldType === 'number' ? 'number' : 'text'}
              value={currentValue || ''}
              onChange={(e) => handleFieldEdit(field.fieldName, e.target.value)}
              placeholder={field.needsManualInput ? 'Manual input required' : ''}
              className={isEdited ? 'border-blue-500 bg-blue-50' : ''}
            />
          )}

          {field.reasoning && (
            <p className="text-xs text-muted-foreground italic">
              💡 {field.reasoning}
            </p>
          )}

          {field.needsManualInput && (
            <p className="text-xs text-orange-600 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Manual input required
            </p>
          )}

          {isEdited && (
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <Edit3 className="w-3 h-3" />
              Field edited by user
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>🤖 AI Prefill Form Demo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test AI-powered form prefilling with confidence scores and user review
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={runAIPrefill}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'Run AI Prefill Test'}
          </Button>
        </div>

        {/* Prefill Results */}
        {prefillResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium mb-2">Prefill Summary:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>Form: <Badge variant="secondary">{prefillResult.subsidyTitle}</Badge></div>
                <div>Overall Confidence: <Badge variant="secondary">{prefillResult.confidence}%</Badge></div>
                <div>Prefilled: <Badge variant="secondary">{prefillResult.prefilledFields}/{prefillResult.totalFields}</Badge></div>
                <div>Success Rate: <Badge variant="secondary">
                  {Math.round((prefillResult.prefilledFields / prefillResult.totalFields) * 100)}%
                </Badge></div>
              </div>
            </div>

            {/* Review Form */}
            {showReview && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Review & Edit Prefilled Form:</h4>
                  <Badge className="text-xs">
                    {Object.keys(editedFields).length} fields edited
                  </Badge>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {prefillResult.prefilledData?.map(renderField)}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button className="flex-1 bg-green-600 hover:bg-green-700">
                    <Check className="w-4 h-4 mr-2" />
                    Accept & Submit Form
                  </Button>
                  <Button variant="outline">
                    Save as Draft
                  </Button>
                </div>
              </div>
            )}

            {/* Console Log Output */}
            <details className="text-xs">
              <summary className="cursor-pointer font-medium">View Full Prefill JSON</summary>
              <pre className="mt-2 bg-gray-100 p-3 rounded overflow-auto max-h-40">
                {JSON.stringify(prefillResult, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          <p><strong>AI Prefill Process:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Fetch farm profile and form schema from database</li>
            <li>Use OpenAI GPT-4 to intelligently map profile data to form fields</li>
            <li>Generate confidence scores and source attribution</li>
            <li>Present review interface with edit capabilities</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIPrefillDemo;