
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { farms } from '@/data/farms';
import { subsidies, getApplicationForm, FormSection, FormField } from '@/data/subsidies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, ChevronLeft, Upload, Save } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ApplicationFormPage = () => {
  const { farmId, subsidyId } = useParams<{ farmId: string; subsidyId: string }>();
  const { t } = useLanguage();
  
  // Find farm and subsidy data
  const farm = farms.find(f => f.id === farmId);
  const subsidy = subsidies.find(s => s.id === subsidyId);
  
  if (!farm || !subsidy) return <div>Farm or subsidy not found</div>;
  
  // Get form structure
  const [formSections, setFormSections] = useState<FormSection[]>(
    getApplicationForm(farmId!, subsidyId!)
  );
  
  // Update form field value
  const updateFieldValue = (sectionId: string, fieldId: string, value: string) => {
    setFormSections(prev => 
      prev.map(section => 
        section.id === sectionId 
          ? {
              ...section,
              fields: section.fields.map(field => 
                field.id === fieldId ? { ...field, value } : field
              )
            }
          : section
      )
    );
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show success message
    toast({
      title: "Application Saved",
      description: t('application.formSaved'),
    });
  };
  
  // Render field based on type
  const renderField = (section: FormSection, field: FormField) => {
    const commonProps = {
      id: field.id,
      value: field.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => 
        updateFieldValue(section.id, field.id, e.target.value),
      className: "w-full",
    };
    
    switch (field.type) {
      case 'textarea':
        return <Textarea {...commonProps} rows={3} />;
      case 'select':
        return (
          <Select 
            defaultValue={field.value} 
            onValueChange={(value) => updateFieldValue(section.id, field.id, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return <Input {...commonProps} type={field.type} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link 
              to={`/farm/${farmId}`} 
              className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
            >
              <ChevronLeft size={16} className="mr-1" />
              Back to Farm Profile
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('application.title')}</h1>
                <p className="text-gray-600">{subsidy.name} - {farm.name}</p>
              </div>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>{subsidy.name}</CardTitle>
              <CardDescription>{t('application.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Accordion type="multiple" defaultValue={['section1']} className="w-full">
                  {formSections.map((section) => (
                    <AccordionItem key={section.id} value={section.id}>
                      <AccordionTrigger className="text-base font-medium">
                        {t(`application.${section.id}` as any) || section.title}
                      </AccordionTrigger>
                      <AccordionContent className="pb-6 pt-2">
                        <div className="space-y-4">
                          {section.fields.map((field) => (
                            <div key={field.id} className="space-y-2">
                              <div className="flex items-center">
                                <Label htmlFor={field.id} className="font-medium">
                                  {field.label}
                                </Label>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info size={14} className="ml-1 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('common.explainThis')}: {field.label}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              {renderField(section, field)}
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                
                <div className="flex justify-between pt-4 border-t">
                  <Button variant="outline" type="button">
                    <Upload size={16} className="mr-2" />
                    {t('common.upload')} {t('common.documents')}
                  </Button>
                  
                  <div className="space-x-2">
                    <Button variant="outline" type="button">
                      <Save size={16} className="mr-2" />
                      {t('common.save')} Draft
                    </Button>
                    <Button type="submit">
                      {t('common.submit')}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ApplicationFormPage;
