import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CANONICAL_FIELD_PRIORITIES } from '@/lib/extraction/canonicalSchema';
import { CheckCircle, AlertTriangle } from 'lucide-react';

interface RecordEditModalProps {
  record: {
    id: string;
    title: string;
    missing_fields: string[];
    audit_notes: string;
    created_at: string;
    raw_log_id: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const RecordEditModal = ({ record, isOpen, onClose, onSave }: RecordEditModalProps) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [fullRecord, setFullRecord] = useState<any>(null);
  const { toast } = useToast();

  // Load full record details when modal opens
  React.useEffect(() => {
    if (isOpen && record) {
      loadFullRecord();
    }
  }, [isOpen, record.id]);

  const loadFullRecord = async () => {
    try {
      setLoadingRecord(true);
      const { data, error } = await supabase
        .from('subsidies_structured')
        .select('*')
        .eq('id', record.id)
        .single();

      if (error) throw error;
      
      setFullRecord(data);
      setFormData(data);
    } catch (error) {
      console.error('Error loading record:', error);
      toast({
        title: "Error",
        description: "Failed to load record details",
        variant: "destructive",
      });
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Update the record with admin corrections
      const updateData = {
        ...formData,
        // Update audit trail
        audit: {
          ...fullRecord.audit,
          admin_edited_at: new Date().toISOString(),
          admin_corrections: Object.keys(formData).filter(key => 
            formData[key] !== fullRecord[key] && record.missing_fields.includes(key)
          ),
        },
        // Remove fields from missing_fields that have been filled
        missing_fields: record.missing_fields.filter(field => 
          !formData[field] || formData[field] === '' || 
          (Array.isArray(formData[field]) && formData[field].length === 0)
        ),
        audit_notes: `${fullRecord.audit_notes || ''}\nAdmin review completed: ${new Date().toISOString()}`
      };

      const { error } = await supabase
        .from('subsidies_structured')
        .update(updateData)
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Record has been updated successfully",
      });

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving record:', error);
      toast({
        title: "Error",
        description: "Failed to save record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const getPriorityLevel = (field: string) => {
    if (CANONICAL_FIELD_PRIORITIES.high.includes(field as any)) return 'High';
    if (CANONICAL_FIELD_PRIORITIES.medium.includes(field as any)) return 'Medium';
    return 'Optional';
  };

  const getPriorityColor = (field: string) => {
    if (CANONICAL_FIELD_PRIORITIES.high.includes(field as any)) return 'destructive';
    if (CANONICAL_FIELD_PRIORITIES.medium.includes(field as any)) return 'secondary';
    return 'outline';
  };

  const renderFieldInput = (fieldName: string) => {
    const value = formData[fieldName] || '';
    const isArray = Array.isArray(value) || ['eligible_countries', 'eligible_regions', 'sectoral_scope', 'eligible_beneficiary_types'].includes(fieldName);
    
    if (isArray) {
      return (
        <Textarea
          value={Array.isArray(value) ? value.join(', ') : value}
          onChange={(e) => handleFieldChange(fieldName, e.target.value.split(',').map(s => s.trim()).filter(s => s))}
          placeholder="Enter comma-separated values"
          className="min-h-[100px]"
        />
      );
    }

    if (['primary_objective', 'assessment_criteria', 'monitoring_requirements'].includes(fieldName)) {
      return (
        <Textarea
          value={value}
          onChange={(e) => handleFieldChange(fieldName, e.target.value)}
          placeholder={`Enter ${fieldName.replace('_', ' ')}`}
          className="min-h-[100px]"
        />
      );
    }

    return (
      <Input
        value={value}
        onChange={(e) => handleFieldChange(fieldName, e.target.value)}
        placeholder={`Enter ${fieldName.replace('_', ' ')}`}
      />
    );
  };

  if (loadingRecord) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin h-8 w-8 border-b-2 border-primary rounded-full"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Record: {record.title || 'Untitled'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This record has {record.missing_fields.length} missing fields that require admin review.
              Fill in the missing information below to improve data quality.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Missing Fields Requiring Attention</h3>
            
            {record.missing_fields.map((fieldName) => (
              <div key={fieldName} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label htmlFor={fieldName} className="text-sm font-medium">
                    {fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Label>
                  <Badge variant={getPriorityColor(fieldName)} className="text-xs">
                    {getPriorityLevel(fieldName)} Priority
                  </Badge>
                </div>
                {renderFieldInput(fieldName)}
                {fullRecord?.source?.[fieldName] && (
                  <p className="text-xs text-muted-foreground">
                    Source: {fullRecord.source[fieldName]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {record.audit_notes && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Audit Notes</Label>
              <div className="p-3 bg-muted rounded text-sm">
                {record.audit_notes}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordEditModal;