import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Edit3, 
  Save, 
  X, 
  Eye, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Download,
  Sparkles,
  Bot,
  User
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { mapFormToExtraction } from '@/lib/extraction/dataMapper';
import DocumentPreviewModal from './DocumentPreviewModal';
import AIFieldClassifier from './AIFieldClassifier';

interface ExtractedField {
  fieldName: string;
  value: any;
  confidence: number;
  source: 'extracted' | 'ai_classified' | 'user_corrected';
  isEditing: boolean;
  originalValue?: any;
  notes?: string;
}

interface FullExtractionReviewProps {
  documentId: string;
  extraction: any;
  farmId: string;
  onSave: (correctedData: any) => void;
  onApplyToForm: (mappedData: any) => void;
  currentFormData?: any; // For bidirectional sync
  onFormDataChange?: (data: any) => void; // For bidirectional sync
}

const FullExtractionReview: React.FC<FullExtractionReviewProps> = ({
  documentId,
  extraction,
  farmId,
  onSave,
  onApplyToForm,
  currentFormData,
  onFormDataChange
}) => {
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [unmappedData, setUnmappedData] = useState<any>({});
  const [showPreview, setShowPreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const document = extraction?.farm_documents;

  const mapFieldsToFormData = useCallback((fieldsList: ExtractedField[]) => {
    const mapping: Record<string, string> = {
      farmName: 'name',
      ownerName: 'ownerName',
      address: 'address',
      totalHectares: 'total_hectares',
      legalStatus: 'legal_status',
      registrationNumber: 'cnp_or_cui',
      revenue: 'revenue',
      country: 'country',
      email: 'email',
      phone: 'phone',
      certifications: 'certifications',
      activities: 'land_use_types',
      description: 'description',
      department: 'department',
      locality: 'locality'
    };

    return fieldsList.reduce((acc, field) => {
      const formField = mapping[field.fieldName] || field.fieldName;
      let value = field.value;

      if (field.fieldName === 'totalHectares') {
        if (typeof value === 'string') {
          const numValue = parseFloat(value);
          if (!isNaN(numValue) && numValue > 0) {
            value = numValue;
          } else {
            return acc;
          }
        }
      }

      if (['certifications', 'activities'].includes(field.fieldName) && typeof value === 'string') {
        value = value.split(/[,•\n]/).map(s => s.trim()).filter(Boolean);
      }

      if (field.fieldName === 'email' && typeof value === 'string') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return acc;
        }
      }

      acc[formField] = value;
      return acc;
    }, {} as any);
  }, []);

  useEffect(() => {
    if (extraction?.extracted_data) {
      initializeFields(extraction.extracted_data);
    }
  }, [extraction]);

  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(mapFieldsToFormData(fields));
    }
  }, [fields, onFormDataChange, mapFieldsToFormData]);

  useEffect(() => {
    if (currentFormData) {
      const formExtraction = mapFormToExtraction(currentFormData, true, false);
      setFields(prev =>
        prev.map(field => {
          const newVal = formExtraction[field.fieldName];
          if (newVal !== undefined && newVal !== field.value) {
            return { ...field, value: newVal, source: 'user_corrected' };
          }
          return field;
        })
      );
    }
  }, [currentFormData]);

  const initializeFields = (extractedData: any) => {
    const knownFields = [
      'farmName', 'ownerName', 'address', 'totalHectares', 'legalStatus', 
      'registrationNumber', 'revenue', 'country', 'email', 'phone',
      'certifications', 'activities', 'description'
    ];

    const initialFields: ExtractedField[] = [];
    const unmapped: any = {};

    // Process known fields
    knownFields.forEach(fieldName => {
      if (extractedData[fieldName]) {
        initialFields.push({
          fieldName,
          value: extractedData[fieldName],
          confidence: extractedData.confidence || 0.8,
          source: 'extracted',
          isEditing: false
        });
      }
    });

    // Process unmapped fields
    Object.keys(extractedData).forEach(key => {
      if (!knownFields.includes(key) && 
          !['confidence', 'error', 'debugInfo', 'rawResponse'].includes(key)) {
        unmapped[key] = extractedData[key];
      }
    });

    setFields(initialFields);
    setUnmappedData(unmapped);
  };

  const getFieldDisplayName = (fieldName: string): string => {
    const displayNames: Record<string, string> = {
      farmName: 'Farm Name',
      ownerName: 'Owner Name',
      address: 'Address',
      totalHectares: 'Total Hectares',
      legalStatus: 'Legal Status',
      registrationNumber: 'Registration Number (CUI)',
      revenue: 'Annual Revenue',
      country: 'Country',
      email: 'Email',
      phone: 'Phone',
      certifications: 'Certifications',
      activities: 'Main Activities',
      description: 'Description'
    };
    return displayNames[fieldName] || fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSourceIcon = (source: ExtractedField['source']) => {
    switch (source) {
      case 'extracted': return <Bot className="h-3 w-3" />;
      case 'ai_classified': return <Sparkles className="h-3 w-3" />;
      case 'user_corrected': return <User className="h-3 w-3" />;
    }
  };

  const toggleEdit = (index: number) => {
    setFields(prev => prev.map((field, i) => {
      if (i === index) {
        if (field.isEditing) {
          // Save changes
          return { ...field, isEditing: false };
        } else {
          // Start editing
          return { ...field, isEditing: true, originalValue: field.value };
        }
      }
      return field;
    }));
  };

  const updateFieldValue = (index: number, newValue: any) => {
    setFields(prev => prev.map((field, i) => {
      if (i === index) {
        setHasChanges(true);
        return { 
          ...field, 
          value: newValue,
          source: 'user_corrected'
        };
      }
      return field;
    }));
  };

  const cancelEdit = (index: number) => {
    setFields(prev => prev.map((field, i) => {
      if (i === index && field.originalValue !== undefined) {
        return { 
          ...field, 
          isEditing: false, 
          value: field.originalValue,
          originalValue: undefined
        };
      }
      return field;
    }));
  };

  const addCustomField = () => {
    const newField: ExtractedField = {
      fieldName: 'customField',
      value: '',
      confidence: 1.0,
      source: 'user_corrected',
      isEditing: true
    };
    setFields(prev => [...prev, newField]);
    setHasChanges(true);
  };

  const removeField = (index: number) => {
    setFields(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const handleAIClassification = async (aiFields: any[]) => {
    setIsProcessingAI(true);
    try {
      const newFields = aiFields.map(aiField => ({
        fieldName: aiField.fieldName,
        value: aiField.value,
        confidence: aiField.confidence,
        source: 'ai_classified' as const,
        isEditing: false
      }));
      
      setFields(prev => [...prev, ...newFields]);
      setHasChanges(true);
      
      toast({
        title: 'AI Classification Complete',
        description: `Added ${aiFields.length} new fields`,
      });
    } catch (error) {
      console.error('AI classification error:', error);
      toast({
        title: 'AI Classification Failed',
        description: 'Could not classify unmapped fields',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingAI(false);
    }
  };

  const saveChanges = async () => {
    const correctedData = fields.reduce((acc, field) => {
      acc[field.fieldName] = field.value;
      return acc;
    }, {} as any);

    // Log corrections for audit trail
    await logFieldCorrections();
    
    onSave(correctedData);
    setHasChanges(false);
    
    toast({
      title: 'Changes Saved',
      description: 'All field corrections have been saved.',
    });
  };

  const logFieldCorrections = async () => {
    try {
      const user = await supabase.auth.getUser();
      const corrections = fields
        .filter(field => field.source === 'user_corrected')
        .map(field => ({
          document_id: documentId,
          field_name: field.fieldName,
          original_value: field.originalValue,
          corrected_value: field.value,
          correction_notes: field.notes,
          corrected_by: user.data.user?.id
        }));

      if (corrections.length > 0) {
        // Use generic SQL insert since TypeScript types are not updated yet
        const { error } = await supabase
          .from('field_corrections' as any)
          .insert(corrections);

        if (error) {
          console.error('Failed to log corrections:', error);
        }
      }
    } catch (error) {
      console.error('Error logging corrections:', error);
    }
  };

  const applyToForm = useCallback(() => {
    try {
      // Only include non-empty fields
      const validFields = fields.filter(field => 
        field.value !== null && field.value !== undefined && field.value !== '' && 
        !(Array.isArray(field.value) && field.value.length === 0)
      );
      
      if (validFields.length === 0) {
        toast({
          title: 'No Data to Apply',
          description: 'Please add some field values before applying to form.',
          variant: 'destructive',
        });
        return;
      }

      const mappedData = validFields.reduce((acc, field) => {
        // Map to form field names
        const mapping: Record<string, string> = {
          farmName: 'name',
          ownerName: 'ownerName',
          address: 'address',
          totalHectares: 'total_hectares',
          legalStatus: 'legal_status',
          registrationNumber: 'cnp_or_cui',
          revenue: 'revenue',
          country: 'country',
          email: 'email',
          phone: 'phone',
          certifications: 'certifications',
          activities: 'land_use_types',
          description: 'description',
          department: 'department',
          locality: 'locality'
        };

        const formField = mapping[field.fieldName] || field.fieldName;
        let value = field.value;

        // Data type transformations with validation
        if (field.fieldName === 'totalHectares') {
          if (typeof value === 'string') {
            const numValue = parseFloat(value);
            if (isNaN(numValue) || numValue <= 0) {
              console.warn(`Invalid hectares value: ${value}`);
              return acc; // Skip invalid values
            }
            value = numValue;
          }
        }
        
        if (['certifications', 'activities'].includes(field.fieldName) && typeof value === 'string') {
          value = value.split(/[,•\n]/).map(s => s.trim()).filter(Boolean);
        }

        // Validate email format
        if (field.fieldName === 'email' && typeof value === 'string') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            console.warn(`Invalid email format: ${value}`);
            return acc; // Skip invalid email
          }
        }

        acc[formField] = value;
        return acc;
      }, {} as any);

      if (Object.keys(mappedData).length === 0) {
        toast({
          title: 'No Valid Data',
          description: 'No valid field values found to apply to form.',
          variant: 'destructive',
        });
        return;
      }

      // Apply with error boundary
      onApplyToForm(mappedData);
      
      toast({
        title: 'Applied to Form',
        description: `Applied ${Object.keys(mappedData).length} fields to the farm form.`,
      });

      // Log application for debugging
      console.log('Applied extraction data to form:', {
        appliedFields: Object.keys(mappedData),
        totalFields: validFields.length,
        documentId
      });
      
    } catch (error) {
      console.error('Error applying data to form:', error);
      toast({
        title: 'Application Failed',
        description: 'Failed to apply data to form. Please try again.',
        variant: 'destructive',
      });
    }
  }, [fields, onApplyToForm, documentId]);

  const exportData = () => {
    const exportData = {
      document: {
        id: documentId,
        name: document?.file_name,
        category: document?.category
      },
      extractedFields: fields.map(field => ({
        field: field.fieldName,
        value: field.value,
        confidence: field.confidence,
        source: field.source,
        displayName: getFieldDisplayName(field.fieldName)
      })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extraction-review-${documentId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderFieldValue = (field: ExtractedField, index: number) => {
    if (field.isEditing) {
      if (Array.isArray(field.value)) {
        return (
          <Textarea
            value={Array.isArray(field.value) ? field.value.join('\n') : field.value}
            onChange={(e) => updateFieldValue(index, e.target.value.split('\n').filter(Boolean))}
            className="min-h-[60px]"
            placeholder="Enter values (one per line)"
          />
        );
      } else if (field.fieldName === 'description' || (typeof field.value === 'string' && field.value.length > 50)) {
        return (
          <Textarea
            value={field.value}
            onChange={(e) => updateFieldValue(index, e.target.value)}
            className="min-h-[60px]"
          />
        );
      } else {
        return (
          <Input
            value={field.value}
            onChange={(e) => updateFieldValue(index, e.target.value)}
          />
        );
      }
    }

    // Display mode
    if (Array.isArray(field.value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {field.value.map((item, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      );
    }

    return (
      <span className="text-sm">{field.value}</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Extraction Review</h3>
          <p className="text-sm text-muted-foreground">
            Review and edit extracted fields from {document?.file_name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4 mr-1" />
            View Document
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={applyToForm}
          disabled={fields.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Apply to Form
        </Button>
        {hasChanges && (
          <Button
            onClick={saveChanges}
            variant="outline"
          >
            <Save className="h-4 w-4 mr-1" />
            Save Changes
          </Button>
        )}
        <Button
          onClick={addCustomField}
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </div>

      {/* Extracted Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Mapped Fields ({fields.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {getFieldDisplayName(field.fieldName)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getSourceIcon(field.source)}
                    <span className="ml-1">{field.source.replace('_', ' ')}</span>
                  </Badge>
                  <div 
                    className={`w-2 h-2 rounded-full ${getConfidenceColor(field.confidence)}`}
                    title={`Confidence: ${Math.round(field.confidence * 100)}%`}
                  />
                </div>
                <div className="flex items-center gap-1">
                  {field.isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleEdit(index)}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancelEdit(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleEdit(index)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeField(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                {renderFieldValue(field, index)}
                {field.source === 'user_corrected' && (
                  <Textarea
                    placeholder="Add notes about this correction..."
                    value={field.notes || ''}
                    onChange={(e) => {
                      setFields(prev => prev.map((f, i) => 
                        i === index ? { ...f, notes: e.target.value } : f
                      ));
                    }}
                    className="text-xs"
                    rows={2}
                  />
                )}
              </div>
              
              <div className="text-xs text-muted-foreground">
                Confidence: {Math.round(field.confidence * 100)}%
              </div>
            </div>
          ))}
          
          {fields.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No mapped fields found</p>
              <p className="text-xs">Try AI classification or add fields manually</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Field Classifier for unmapped data */}
      {Object.keys(unmappedData).length > 0 && (
        <AIFieldClassifier
          unmappedData={unmappedData}
          onClassify={handleAIClassification}
          isProcessing={isProcessingAI}
        />
      )}

      {/* Document Preview Modal */}
      {showPreview && document && (
        <DocumentPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          document={document}
        />
      )}
    </div>
  );
};

export default FullExtractionReview;