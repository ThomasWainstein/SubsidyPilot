
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator } from 'lucide-react';

interface SimulationFormProps {
  farmId?: string;
  onSimulate?: (data: any) => void;
}

export const SimulationForm: React.FC<SimulationFormProps> = ({ farmId, onSimulate }) => {
  const [formData, setFormData] = useState({
    projectType: '',
    projectCost: '',
    duration: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const simulationResult = {
      eligibilityScore: Math.floor(Math.random() * 40) + 60, // 60-100%
      fundingAmount: Math.floor(parseFloat(formData.projectCost || '0') * 0.4),
      recommendations: [
        'Consider environmental certifications to improve eligibility',
        'Document all project phases for better application success',
        'Review regional specific requirements'
      ]
    };

    onSimulate?.(simulationResult);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator size={20} />
          Subsidy Simulation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="projectType">Project Type</Label>
            <Select value={formData.projectType} onValueChange={(value) => 
              setFormData(prev => ({ ...prev, projectType: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select project type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="infrastructure">Infrastructure Development</SelectItem>
                <SelectItem value="technology">Technology Adoption</SelectItem>
                <SelectItem value="sustainability">Sustainability Initiative</SelectItem>
                <SelectItem value="expansion">Farm Expansion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="projectCost">Estimated Project Cost (€)</Label>
            <Input
              id="projectCost"
              type="number"
              value={formData.projectCost}
              onChange={(e) => setFormData(prev => ({ ...prev, projectCost: e.target.value }))}
              placeholder="Enter total project cost"
            />
          </div>

          <div>
            <Label htmlFor="duration">Project Duration (months)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: e.target.value }))}
              placeholder="Enter project duration"
            />
          </div>

          <div>
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your project..."
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full">
            Run Simulation
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
