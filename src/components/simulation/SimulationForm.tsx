
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subsidies, Subsidy } from '@/data/subsidies';
import { useToast } from '@/hooks/use-toast';

interface SimulationFormProps {
  onShowResults: (subsidies: Subsidy[]) => void;
}

const formSchema = z.object({
  region: z.string().min(1, { message: "Region is required" }),
  country: z.string().min(1, { message: "Country is required" }),
  size: z.string().min(1, { message: "Farm size is required" }),
  irrigation: z.string().min(1, { message: "Irrigation method is required" }),
  certifications: z.string().optional(),
  carbonScore: z.string().optional(),
  goals: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const SimulationForm = ({ onShowResults }: SimulationFormProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      region: 'Normandy',
      country: 'France',
      size: '45',
      irrigation: 'Drip Irrigation',
      certifications: 'Organic, Eco-Friendly',
      carbonScore: '78',
      goals: 'Reduce water usage by 30%, Implement sustainable farming practices',
    },
  });

  const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      // Randomly select 2-4 subsidies
      const shuffled = [...subsidies].sort(() => 0.5 - Math.random());
      const matchingSubsidies = shuffled.slice(0, Math.floor(Math.random() * 3) + 2); // 2 to 4 subsidies
      
      // Adjust match confidence based on form input
      const adjustedSubsidies = matchingSubsidies.map(subsidy => {
        const confidence = Math.floor(Math.random() * 30) + 70; // 70-99
        return {
          ...subsidy,
          matchConfidence: confidence
        };
      });
      
      toast({
        title: t('messages.simulationComplete'),
        description: t('messages.simulationCompleteDesc'),
      });
      
      setIsLoading(false);
      onShowResults(adjustedSubsidies);
    }, 1500);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('simulation.form.region')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('simulation.form.country')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="France">France</SelectItem>
                    <SelectItem value="Spain">Spain</SelectItem>
                    <SelectItem value="Romania">Romania</SelectItem>
                    <SelectItem value="Italy">Italy</SelectItem>
                    <SelectItem value="Germany">Germany</SelectItem>
                    <SelectItem value="Poland">Poland</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="size"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('simulation.form.size')}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min="1" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="irrigation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('simulation.form.irrigation')}</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Drip Irrigation">Drip Irrigation</SelectItem>
                    <SelectItem value="Sprinkler">Sprinkler</SelectItem>
                    <SelectItem value="Flood Irrigation">Flood Irrigation</SelectItem>
                    <SelectItem value="Center Pivot">Center Pivot</SelectItem>
                    <SelectItem value="Subsurface Irrigation">Subsurface Irrigation</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="certifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('simulation.form.certifications')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="carbonScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('simulation.form.carbonScore')}</FormLabel>
              <FormControl>
                <Input {...field} type="number" min="0" max="100" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="goals"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('simulation.form.goals')}</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('common.loading') : t('simulation.form.submit')}
        </Button>
      </form>
    </Form>
  );
};

export default SimulationForm;
