
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Link as LinkIcon, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Subsidy } from '@/data/subsidies';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../ui/card';

interface ImportSubsidyFormProps {
  farmId: string;
  farmRegion: string;
  onAddSubsidy: (subsidy: Subsidy) => void;
}

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  deadline: z.date({
    required_error: "Deadline is required",
  }),
  matchConfidence: z.number().min(1).max(100),
});

export type ImportSubsidyFormValues = z.infer<typeof formSchema>;

export const ImportSubsidyForm: React.FC<ImportSubsidyFormProps> = ({ 
  farmId, 
  farmRegion,
  onAddSubsidy 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<null | {
    name: string;
    code: string;
    region: string;
    grant: string;
  }>(null);

  const form = useForm<ImportSubsidyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      description: "",
      matchConfidence: 85,
    },
  });

  const fetchSubsidyInfo = async (url: string) => {
    setIsLoading(true);
    
    // Simulate API call to fetch subsidy data from URL
    // In a real app, this would call an actual API endpoint
    setTimeout(() => {
      // Generate mock subsidy data
      setPreviewData({
        name: "Eco-Agricultural Transition Fund",
        code: "EU-ECO-2023",
        region: farmRegion || "EU-wide",
        grant: "€25,000",
      });
      setIsLoading(false);
    }, 1500);
  };

  const handleUrlBlur = () => {
    const url = form.getValues("url");
    if (url && !form.formState.errors.url) {
      fetchSubsidyInfo(url);
    }
  };

  function onSubmit(data: ImportSubsidyFormValues) {
    if (!previewData) return;
    
    const newSubsidy: Subsidy = {
      id: `import-${Date.now()}`,
      name: previewData.name,
      description: data.description,
      region: previewData.region,
      deadline: format(data.deadline, 'yyyy-MM-dd'),
      grant: previewData.grant,
      matchConfidence: data.matchConfidence,
      code: previewData.code,
      documentsRequired: ["Application Form", "Business Registration", "Financial Statements"],
      isManuallyAdded: true,
    };
    
    onAddSubsidy(newSubsidy);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subsidy Portal URL</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input 
                    placeholder="https://ec.europa.eu/subsidies/..." 
                    {...field} 
                    onBlur={handleUrlBlur} 
                  />
                  {isLoading && (
                    <Button disabled variant="outline" type="button">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Enter the URL of the official subsidy portal page
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {previewData && (
          <Card className="bg-blue-50/50 border-blue-100">
            <CardContent className="pt-4">
              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-blue-500" />
                <span>Found Subsidy Information</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Name:</div>
                <div className="font-medium">{previewData.name}</div>
                <div className="text-muted-foreground">Code:</div>
                <div className="font-medium">{previewData.code}</div>
                <div className="text-muted-foreground">Region:</div>
                <div className="font-medium">{previewData.region}</div>
                <div className="text-muted-foreground">Grant Amount:</div>
                <div className="font-medium">{previewData.grant}</div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Add or edit description for this subsidy" 
                  className="resize-none h-20" 
                  {...field} 
                />
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
        
        <div className="pt-4 flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading || !previewData}
          >
            Add Subsidy
          </Button>
        </div>
      </form>
    </Form>
  );
};
