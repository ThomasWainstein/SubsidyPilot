
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { useFarm } from '@/hooks/useFarms';
import { useSubsidy } from '@/hooks/useSubsidies';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Info, ChevronLeft, Upload, Save, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { handleApiError, showSuccessMessage } from '@/utils/errorHandling';
import PageErrorBoundary from '@/components/error/PageErrorBoundary';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Form section and field types
interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'textarea' | 'select';
  value: string;
  options?: string[];
}

interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}

// Helper function to handle multilingual text
const getLocalizedText = (text: string | any): string => {
  if (!text) return '';
  if (typeof text === 'string') {
    return text;
  }
  if (typeof text === 'object' && text.en) {
    return text.en;
  }
  return String(text);
};

// Generate a basic application form structure
const getApplicationForm = (farmId: string, subsidyId: string): FormSection[] => {
  return [
    {
      id: 'section1',
      title: 'Basic Information',
      fields: [
        {
          id: 'applicant_name',
          label: 'Applicant Name',
          type: 'text',
          value: ''
        },
        {
          id: 'contact_email',
          label: 'Contact Email',
          type: 'email',
          value: ''
        },
        {
          id: 'project_description',
          label: 'Project Description',
          type: 'textarea',
          value: ''
        }
      ]
    },
    {
      id: 'section2',
      title: 'Financial Information',
      fields: [
        {
          id: 'requested_amount',
          label: 'Requested Amount (€)',
          type: 'number',
          value: ''
        },
        {
          id: 'project_duration',
          label: 'Project Duration (months)',
          type: 'number',
          value: ''
        }
      ]
    }
  ];
};

const ApplicationFormPage = () => {
  const { farmId, subsidyId } = useParams<{ farmId: string; subsidyId: string }>();
  const { t } = useLanguage();
  
  // Fetch farm and subsidy data from Supabase
  const { data: farm, isLoading: farmLoading, error: farmError } = useFarm(farmId!);
  const { data: subsidy, isLoading: subsidyLoading, error: subsidyError } = useSubsidy(subsidyId!);
  
  // Get form structure
  const [formSections, setFormSections] = useState<FormSection[]>(
    getApplicationForm(farmId!, subsidyId!)
  );

  // Handle errors
  if (farmError) {
    handleApiError(farmError, 'Farm data');
  }
  if (subsidyError) {
    handleApiError(subsidyError, 'Subsidy data');
  }
  
  // Loading state
  if (farmLoading || subsidyLoading) {
    return (
      <PageErrorBoundary pageName="Application Form">
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-grow flex items-center justify-center">
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin" />
              <span>Loading application form...</span>
            </div>
          </main>
        </div>
      </PageErrorBoundary>
    );
  }
  
  // Error state
  if (farmError || subsidyError || !farm || !subsidy) {
    return (
      <PageErrorBoundary pageName="Application Form">
        <div className="min-h-screen flex flex-col bg-gray-50">
          <Navbar />
          <main className="flex-grow flex items-center justify-center">
            <Card className="w-96">
              <CardHeader>
                <CardTitle>Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-500 mb-4">
                  {farmError?.message || subsidyError?.message || 'Farm or subsidy not found'}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                  <Link to={`/farm/${farmId}`}>
                    <Button>Back to Farm Profile</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </PageErrorBoundary>
    );
  }
  
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
    
    try {
      // Show success message
      showSuccessMessage("Your application has been saved as a draft.", "Application Saved");
    } catch (error) {
      handleApiError(error, 'Form submission');
    }
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
          <Select value={field.value} onValueChange={(value) => updateFieldValue(section.id, field.id, value)}>
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
    <PageErrorBoundary pageName="Application Form">
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
                  <h1 className="text-2xl font-bold text-gray-900">Application Form</h1>
                  <p className="text-gray-600">{getLocalizedText(subsidy.title)} - {farm.name}</p>
                </div>
              </div>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>{getLocalizedText(subsidy.title)}</CardTitle>
                <CardDescription>Complete your subsidy application</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Accordion type="multiple" defaultValue={['section1']} className="w-full">
                    {formSections.map((section) => (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="text-base font-medium">
                          {section.title}
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
                                        <p>Help for: {field.label}</p>
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
                      Upload Documents
                    </Button>
                    
                    <div className="space-x-2">
                      <Button variant="outline" type="button">
                        <Save size={16} className="mr-2" />
                        Save Draft
                      </Button>
                      <Button type="submit">
                        Submit Application
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </PageErrorBoundary>
  );
};

export default ApplicationFormPage;
