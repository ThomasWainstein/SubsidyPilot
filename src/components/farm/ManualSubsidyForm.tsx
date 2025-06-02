
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Plus } from 'lucide-react';

interface ManualSubsidyFormProps {
  farmId: string;
  onSubsidyAdded?: () => void;
}

export const ManualSubsidyForm: React.FC<ManualSubsidyFormProps> = ({ farmId, onSubsidyAdded }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    deadline: '',
    category: '',
    source: '',
    requirements: '',
    notes: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in the required fields (title and description)',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate adding subsidy
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: 'Success',
        description: 'Custom subsidy added successfully'
      });
      
      setFormData({
        title: '', description: '', amount: '', deadline: '',
        category: '', source: '', requirements: '', notes: ''
      });
      onSubsidyAdded?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add custom subsidy',
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
          <Plus size={20} />
          Add Custom Subsidy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Subsidy Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter subsidy title"
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => 
                setFormData(prev => ({ ...prev, category: value }))
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agriculture">Agriculture</SelectItem>
                  <SelectItem value="environment">Environment</SelectItem>
                  <SelectItem value="technology">Technology</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the subsidy program..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="amount">Funding Amount (€)</Label>
              <Input
                id="amount"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Maximum funding"
              />
            </div>

            <div>
              <Label htmlFor="deadline">Application Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="source">Funding Source</Label>
              <Input
                id="source"
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                placeholder="e.g., EU, National, Regional"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="requirements">Eligibility Requirements</Label>
            <Textarea
              id="requirements"
              value={formData.requirements}
              onChange={(e) => setFormData(prev => ({ ...prev, requirements: e.target.value }))}
              placeholder="List the main eligibility criteria..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Plus className="animate-spin mr-2" size={16} />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2" size={16} />
                Add Custom Subsidy
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
