
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useForm } from 'react-hook-form';
import { Form, FormField, FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Subsidy } from '@/types/subsidy';
import { Textarea } from '@/components/ui/textarea';

interface SubsidyFormValues {
  name: string;
  description: string;
  region: string;
  deadline: Date;
  grant: string;
  matchConfidence: number;
  code: string;
  requiredDocuments: { id: string; name: string; }[];
}

interface ManualSubsidyFormProps {
  onAddSubsidy: (subsidy: Subsidy) => void;
  onClose: () => void;
}

const regions = [
  "EU-wide",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Romania",
  "Netherlands",
  "Belgium",
  "Austria",
  "Poland"
];

export const ManualSubsidyForm: React.FC<ManualSubsidyFormProps> = ({ onAddSubsidy, onClose }) => {
  const { t } = useLanguage();
  const [requiredDocuments, setRequiredDocuments] = useState<{ id: string; name: string; }[]>([
    { id: uuidv4(), name: '' }
  ]);

  const form = useForm<SubsidyFormValues>({
    defaultValues: {
      name: '',
      description: '',
      region: '',
      deadline: new Date(),
      grant: '',
      matchConfidence: 85,
      code: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      requiredDocuments: [{ id: uuidv4(), name: '' }],
    },
  });

  const handleSubmit = (data: SubsidyFormValues) => {
    const filteredDocs = requiredDocuments.filter(doc => doc.name.trim() !== '').map(doc => doc.name);
    
    const newSubsidy: Subsidy = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      region: data.region,
      deadline: format(data.deadline, 'yyyy-MM-dd'),
      grant: data.grant,
      matchConfidence: data.matchConfidence,
      code: data.code,
      documentsRequired: filteredDocs,
      isManuallyAdded: true
    };
    
    onAddSubsidy(newSubsidy);
    form.reset();
    setRequiredDocuments([{ id: uuidv4(), name: '' }]);
    onClose();
  };

  const addDocument = () => {
    setRequiredDocuments([...requiredDocuments, { id: uuidv4(), name: '' }]);
  };

  const updateDocument = (id: string, value: string) => {
    setRequiredDocuments(requiredDocuments.map(doc => 
      doc.id === id ? { ...doc, name: value } : doc
    ));
  };

  const removeDocument = (id: string) => {
    if (requiredDocuments.length > 1) {
      setRequiredDocuments(requiredDocuments.filter(doc => doc.id !== id));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subsidy-name">{t('common.subsidyName')}</Label>
            <Input 
              id="subsidy-name" 
              {...form.register('name')}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subsidy-description">Description</Label>
            <Textarea 
              id="subsidy-description" 
              {...form.register('description')}
              placeholder="Brief description of the subsidy"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subsidy-region">{t('common.region')}</Label>
              <Select 
                onValueChange={(value) => form.setValue('region', value)}
                defaultValue={form.getValues('region')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{t('subsidies.deadline')}</Label>
              <FormField
                control={form.control}
                name="deadline"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subsidy-grant">{t('common.grantAmount')}</Label>
              <Input 
                id="subsidy-grant" 
                placeholder="e.g., Up to €75,000"
                {...form.register('grant')}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subsidy-code">{t('subsidies.grantCode')}</Label>
              <Input 
                id="subsidy-code" 
                placeholder="e.g., EU-GRN-1234"
                {...form.register('code')}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="match-confidence">{t('common.matchConfidence')}</Label>
              <span className="text-sm">{form.watch('matchConfidence')}%</span>
            </div>
            <Slider
              id="match-confidence"
              min={0}
              max={100}
              step={1}
              value={[form.watch('matchConfidence')]}
              onValueChange={(values) => form.setValue('matchConfidence', values[0])}
              className="py-2"
            />
          </div>
          
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>{t('common.documentsRequired')}</Label>
            </div>
            
            {requiredDocuments.map((doc, index) => (
              <div key={doc.id} className="flex items-center gap-2">
                <Input
                  placeholder={`${t('common.requiredDocument')} ${index + 1}`}
                  value={doc.name}
                  onChange={(e) => updateDocument(doc.id, e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(doc.id)}
                  disabled={requiredDocuments.length === 1}
                >
                  &times;
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDocument}
              className="mt-2"
            >
              + {t('common.addAnother')}
            </Button>
          </div>
        </div>
        
        <Button type="submit" className="w-full mt-6">
          {t('common.saveToFarm')}
        </Button>
      </form>
    </Form>
  );
};
