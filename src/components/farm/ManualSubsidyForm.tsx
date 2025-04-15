
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, X, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Subsidy } from '@/data/subsidies';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface ManualSubsidyFormProps {
  farmId: string;
  farmRegion: string;
  onAddSubsidy: (subsidy: Subsidy) => void;
}

const formSchema = z.object({
  name: z.string().min(3, { message: "Subsidy name must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  region: z.string().min(2, { message: "Region must be specified" }),
  deadline: z.date({
    required_error: "Deadline is required",
  }),
  grant: z.string().min(1, { message: "Grant amount is required" }),
  matchConfidence: z.number().min(1).max(100),
  code: z.string().min(3, { message: "Subsidy code must be at least 3 characters" }),
  requiredDocuments: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, { message: "Document name is required" }),
    })
  ),
});

export type ManualSubsidyFormValues = z.infer<typeof formSchema>;

export const ManualSubsidyForm: React.FC<ManualSubsidyFormProps> = ({ 
  farmId, 
  farmRegion,
  onAddSubsidy 
}) => {
  const form = useForm<ManualSubsidyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      region: farmRegion || "France",
      grant: "€0",
      matchConfidence: 75,
      code: generateRandomCode(),
      requiredDocuments: [{ id: "1", name: "" }],
    },
  });

  function onSubmit(data: ManualSubsidyFormValues) {
    const newSubsidy: Subsidy = {
      id: `manual-${Date.now()}`,
      name: data.name,
      description: data.description,
      region: data.region,
      deadline: format(data.deadline, 'yyyy-MM-dd'),
      grant: data.grant,
      matchConfidence: data.matchConfidence,
      code: data.code,
      documentsRequired: data.requiredDocuments.map(doc => doc.name),
      isManuallyAdded: true,
    };
    
    onAddSubsidy(newSubsidy);
  }

  const addDocument = () => {
    const currentDocs = form.getValues().requiredDocuments || [];
    form.setValue('requiredDocuments', [
      ...currentDocs,
      { id: Date.now().toString(), name: "" }
    ]);
  };

  const removeDocument = (index: number) => {
    const currentDocs = form.getValues().requiredDocuments || [];
    if (currentDocs.length > 1) {
      form.setValue('requiredDocuments', currentDocs.filter((_, i) => i !== index));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subsidy Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Organic Transition Grant" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Brief description of the subsidy program" 
                  className="resize-none h-20" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Region</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. EU-wide, France, Spain" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Application Deadline</FormLabel>
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
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="grant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grant Amount</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. €15,000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subsidy Code</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. EU-ORG-2023" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="matchConfidence"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Match Confidence ({field.value}%)</FormLabel>
              <FormControl>
                <Slider 
                  defaultValue={[field.value]} 
                  min={1} 
                  max={100} 
                  step={1}
                  onValueChange={(value) => field.onChange(value[0])}
                />
              </FormControl>
              <FormDescription>
                How confident are you that this farm qualifies for this subsidy?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <FormLabel>Required Documents</FormLabel>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addDocument}
              className="h-8 px-2"
            >
              <Plus size={16} className="mr-1" /> Add Document
            </Button>
          </div>
          
          {form.watch('requiredDocuments')?.map((doc, index) => (
            <div key={doc.id} className="flex items-center gap-2 mb-2">
              <FormField
                control={form.control}
                name={`requiredDocuments.${index}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1 mb-0">
                    <FormControl>
                      <Input 
                        placeholder="e.g. Land Registry Certificate" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                className="h-10 w-10 p-0"
                onClick={() => removeDocument(index)}
              >
                <X size={16} />
              </Button>
            </div>
          ))}
          {form.formState.errors.requiredDocuments && (
            <p className="text-sm font-medium text-destructive">
              At least one document is required
            </p>
          )}
        </div>
        
        <div className="pt-4 flex justify-end">
          <Button type="submit">Add Subsidy</Button>
        </div>
      </form>
    </Form>
  );
};

function generateRandomCode() {
  const prefix = ["EU", "FR", "ES", "RO"][Math.floor(Math.random() * 4)];
  const type = ["ORG", "TECH", "SOIL", "WATER", "SOLAR"][Math.floor(Math.random() * 5)];
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${type}-${numbers}`;
}
