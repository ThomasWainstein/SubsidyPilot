
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Download, Upload } from 'lucide-react';

interface ImportSubsidyFormProps {
  farmId: string;
  onImportComplete?: () => void;
}

export const ImportSubsidyForm: React.FC<ImportSubsidyFormProps> = ({ farmId, onImportComplete }) => {
  const [formData, setFormData] = useState({
    subsidyUrl: '',
    description: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subsidyUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a subsidy URL or identifier',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate import process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: 'Success',
        description: 'Subsidy information imported successfully'
      });
      
      setFormData({ subsidyUrl: '', description: '', notes: '' });
      onImportComplete?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to import subsidy information',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download size={20} />
          Import Subsidy from External Source
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subsidyUrl">Subsidy URL or Identifier</Label>
            <Input
              id="subsidyUrl"
              value={formData.subsidyUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, subsidyUrl: e.target.value }))}
              placeholder="Enter subsidy URL or reference number"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the subsidy..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes or requirements..."
              rows={2}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Upload className="animate-spin mr-2" size={16} />
                Importing...
              </>
            ) : (
              <>
                <Download className="mr-2" size={16} />
                Import Subsidy
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
