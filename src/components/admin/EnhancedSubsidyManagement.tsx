import React, { useState } from 'react';
import { useSubsidies, useCreateSubsidy, useDeleteSubsidy } from '@/hooks/useSubsidies';
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
import { getSubsidyTitle } from '@/utils/subsidyFormatting';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { StatusBadge } from '@/components/ui/status-badge';

const EnhancedSubsidyManagement = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { data: subsidies, isLoading } = useSubsidies();
  const createSubsidyMutation = useCreateSubsidy();
  const deleteSubsidyMutation = useDeleteSubsidy();

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
      const subsidyData = {
        raw_log_id: 'manual-' + Date.now(),
        title: typeof data.title === 'object' ? data.title.en || data.title.ro || '' : data.title,
        description: typeof data.description === 'object' ? data.description.en || data.description.ro || '' : data.description,
        eligibility: typeof data.eligibility_criteria === 'object' ? JSON.stringify(data.eligibility_criteria) : data.eligibility_criteria,
        region: Array.isArray(data.region) ? data.region : [data.region || ''],
        sector: Array.isArray(data.categories) ? data.categories : [data.categories || ''],
        funding_type: data.funding_type,
        deadline: data.deadline,
        amount: data.amount_max && data.amount_min ? [data.amount_min, data.amount_max] : (data.amount_max ? [data.amount_max] : (data.amount_min ? [data.amount_min] : null)),
        url: `manual-subsidy-${Date.now()}`,
        agency: 'Manual Entry',
      };
      
      await createSubsidyMutation.mutateAsync(subsidyData);
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

  const handleDelete = async (subsidyId: string) => {
    try {
      await deleteSubsidyMutation.mutateAsync(subsidyId);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const filteredSubsidies = subsidies?.filter(subsidy => {
    const title = getSubsidyTitle(subsidy).toLowerCase();
    const matchesSearch = title.includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || subsidy.record_status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <LoadingSpinner text="Loading subsidies..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Enhanced Subsidy Management
            <HelpTooltip content="Create, edit, and manage agricultural subsidies. This interface allows you to manually add subsidies or view those automatically scraped from government websites." />
          </h1>
          <p className="text-muted-foreground">
            Manage agricultural subsidies with enhanced search and filtering
          </p>
        </div>
        
        <EnhancedButton 
          onClick={() => setShowCreateForm(true)}
          tooltip="Create a new subsidy entry with multilingual support"
          icon={<Plus className="w-4 h-4" />}
        >
          Add New Subsidy
        </EnhancedButton>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subsidies by title, agency, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {searchTerm && (
            <div className="mt-2 text-sm text-muted-foreground">
              Found {filteredSubsidies?.length || 0} subsidies matching "{searchTerm}"
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Create New Subsidy
              <EnhancedButton
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                tooltip="Cancel subsidy creation"
              >
                Cancel
              </EnhancedButton>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="flex items-center gap-2">
                    Subsidy Code *
                    <HelpTooltip content="Unique identifier for the subsidy (e.g., CAP-2024-001)" />
                  </Label>
                  <Input
                    id="code"
                    {...form.register('code')}
                    placeholder="e.g., CAP-2024-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="funding_type" className="flex items-center gap-2">
                    Funding Type
                    <HelpTooltip content="Source of funding: public (government), private (company), or mixed" />
                  </Label>
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

              {/* Multilingual Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title-en" className="flex items-center gap-2">
                    Title (English) *
                    <HelpTooltip content="Primary title of the subsidy in English" />
                  </Label>
                  <Input
                    id="title-en"
                    {...form.register('title.en')}
                    placeholder="English title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title-ro" className="flex items-center gap-2">
                    Title (Romanian)
                    <HelpTooltip content="Romanian translation of the subsidy title" />
                  </Label>
                  <Input
                    id="title-ro"
                    {...form.register('title.ro')}
                    placeholder="Romanian title"
                  />
                </div>
              </div>

              {/* Descriptions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="description-en">Description (English) *</Label>
                  <Textarea
                    id="description-en"
                    {...form.register('description.en')}
                    placeholder="English description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description-ro">Description (Romanian)</Label>
                  <Textarea
                    id="description-ro"
                    {...form.register('description.ro')}
                    placeholder="Romanian description"
                    rows={3}
                  />
                </div>
              </div>

              {/* Categories and Regions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Categories
                    <HelpTooltip content="Select all applicable subsidy categories. This helps with matching to relevant farmers." />
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {standardSubsidyCategories.slice(0, 12).map((category) => (
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
                  <Label className="flex items-center gap-2">
                    Regions
                    <HelpTooltip content="Select applicable regions. Leave empty for nationwide subsidies." />
                  </Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded-md p-2">
                    {standardRegions.slice(0, 12).map((region) => (
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
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <EnhancedButton
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  tooltip="Cancel without saving"
                >
                  Cancel
                </EnhancedButton>
                <EnhancedButton 
                  type="submit" 
                  loading={createSubsidyMutation.isPending}
                  loadingText="Creating subsidy..."
                  tooltip="Save this subsidy to the database"
                >
                  Create Subsidy
                </EnhancedButton>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Subsidies List */}
      <div className="grid gap-4">
        {filteredSubsidies?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'No subsidies match your search criteria.' : 'No subsidies found.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredSubsidies?.map((subsidy) => {
            const title = getSubsidyTitle(subsidy);

            return (
              <Card key={subsidy.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{title}</h3>
                        <StatusBadge status={subsidy.record_status === 'active' ? 'ready' : 'pending'} />
                        <Badge variant="outline">{subsidy.agency || 'Unknown Agency'}</Badge>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-2">
                        {(Array.isArray(subsidy.sector) ? subsidy.sector : (subsidy.sector ? [subsidy.sector] : [])).map((sector, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {sector}
                          </Badge>
                        ))}
                        {subsidy.funding_type && (
                          <Badge variant="secondary" className="text-xs">
                            {subsidy.funding_type}
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        Region: {Array.isArray(subsidy.region) ? subsidy.region.join(', ') : (subsidy.region || 'All regions')}
                      </div>

                      {subsidy.deadline && (
                        <div className="text-sm text-muted-foreground">
                          Deadline: {new Date(subsidy.deadline).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <EnhancedButton 
                        size="sm" 
                        variant="outline"
                        tooltip="Edit this subsidy"
                        icon={<Edit className="w-4 h-4" />}
                      />
                      <EnhancedButton 
                        size="sm" 
                        variant="outline"
                        tooltip="Delete this subsidy"
                        confirmAction={true}
                        confirmMessage="Are you sure you want to delete this subsidy? This action cannot be undone."
                        onClick={() => handleDelete(subsidy.id)}
                        icon={<Trash2 className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      {filteredSubsidies && filteredSubsidies.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>Showing {filteredSubsidies.length} of {subsidies?.length || 0} subsidies</span>
              <div className="flex gap-4">
                <span>Active: {filteredSubsidies.filter(s => s.record_status === 'active').length}</span>
                <span>Draft: {filteredSubsidies.filter(s => s.record_status === 'draft').length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedSubsidyManagement;