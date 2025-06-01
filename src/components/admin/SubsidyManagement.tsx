
import React, { useState } from 'react';
import { useSubsidies, useCreateSubsidy } from '@/hooks/useSubsidies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { subsidyCreationSchema, type SubsidyCreationData, standardSubsidyCategories, standardRegions } from '@/schemas/subsidyValidation';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';

const SubsidyManagement = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { data: subsidies, isLoading } = useSubsidies();
  const createSubsidyMutation = useCreateSubsidy();

  const form = useForm<SubsidyCreationData>({
    resolver: zodResolver(subsidyCreationSchema),
    defaultValues: {
      code: '',
      title: { en: '', ro: '' },
      description: { en: '', ro: '' },
      region: [],
      categories: [],
      funding_type: 'public',
      status: 'open',
      language: ['en', 'ro'],
      legal_entities: [],
    },
  });

  const onSubmit = async (data: SubsidyCreationData) => {
    try {
      await createSubsidyMutation.mutateAsync(data);
      setShowCreateForm(false);
      form.reset();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    const currentCategories = form.getValues('categories');
    const newCategories = checked
      ? [...currentCategories, category]
      : currentCategories.filter(c => c !== category);
    form.setValue('categories', newCategories);
  };

  const handleRegionChange = (region: string, checked: boolean) => {
    const currentRegions = form.getValues('region');
    const newRegions = checked
      ? [...currentRegions, region]
      : currentRegions.filter(r => r !== region);
    form.setValue('region', newRegions);
  };

  if (isLoading) {
    return <div>Loading subsidies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Subsidy Management</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add New Subsidy
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Subsidy</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Subsidy Code *</Label>
                  <Input
                    id="code"
                    {...form.register('code')}
                    placeholder="e.g., CAP-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funding_type">Funding Type</Label>
                  <Select onValueChange={(value: any) => form.setValue('funding_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select funding type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title-en">Title (English) *</Label>
                  <Input
                    id="title-en"
                    {...form.register('title.en')}
                    placeholder="English title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title-ro">Title (Romanian)</Label>
                  <Input
                    id="title-ro"
                    {...form.register('title.ro')}
                    placeholder="Romanian title"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description-en">Description (English) *</Label>
                  <Textarea
                    id="description-en"
                    {...form.register('description.en')}
                    placeholder="English description"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description-ro">Description (Romanian)</Label>
                  <Textarea
                    id="description-ro"
                    {...form.register('description.ro')}
                    placeholder="Romanian description"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Categories</Label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {standardSubsidyCategories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={category}
                        checked={form.watch('categories').includes(category)}
                        onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                      />
                      <Label htmlFor={category} className="text-sm">{category}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Regions</Label>
                <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                  {standardRegions.slice(0, 20).map((region) => (
                    <div key={region} className="flex items-center space-x-2">
                      <Checkbox
                        id={region}
                        checked={form.watch('region').includes(region)}
                        onCheckedChange={(checked) => handleRegionChange(region, checked as boolean)}
                      />
                      <Label htmlFor={region} className="text-sm">{region}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createSubsidyMutation.isPending}>
                  {createSubsidyMutation.isPending ? 'Creating...' : 'Create Subsidy'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {subsidies?.map((subsidy) => {
          const title = typeof subsidy.title === 'object' && subsidy.title
            ? subsidy.title.en || subsidy.title.ro || Object.values(subsidy.title)[0]
            : subsidy.title || 'Untitled';

          return (
            <Card key={subsidy.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{title}</h3>
                      <Badge variant="outline">{subsidy.code}</Badge>
                      <Badge variant={subsidy.status === 'open' ? 'default' : 'secondary'}>
                        {subsidy.status}
                      </Badge>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {subsidy.categories?.slice(0, 5).map((category, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-sm text-gray-600">
                      Regions: {subsidy.region?.join(', ') || 'All regions'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SubsidyManagement;
