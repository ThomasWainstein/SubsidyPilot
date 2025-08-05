import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { CalendarIcon, HelpCircle, Upload, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { FormFieldSchema } from './DynamicFormGenerator';

interface DynamicFormFieldProps {
  field: FormFieldSchema;
  value: any;
  error?: string;
  onChange: (value: any) => void;
  farmData?: any;
}

export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  field,
  value,
  error,
  onChange,
  farmData
}) => {
  const renderFieldInput = () => {
    switch (field.type) {
      case 'text':
      case 'email':
        return (
          <Input
            type={field.type}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-destructive")}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={cn(error && "border-destructive")}
          />
        );

      case 'currency':
        return (
          <div className="relative">
            <Input
              type="number"
              value={value || ''}
              onChange={(e) => onChange(e.target.value ? Number(e.target.value) : '')}
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              className={cn("pl-8", error && "border-destructive")}
              step="0.01"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
              €
            </span>
          </div>
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-destructive")}
            rows={4}
          />
        );

      case 'select':
        return (
          <Select value={value || ''} onValueChange={onChange}>
            <SelectTrigger className={cn(error && "border-destructive")}>
              <SelectValue placeholder={field.placeholder || 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value || false}
              onCheckedChange={onChange}
              id={field.id}
            />
            <Label htmlFor={field.id} className="text-sm">
              {field.label}
            </Label>
          </div>
        );

      case 'radio':
        return (
          <RadioGroup value={value || ''} onValueChange={onChange}>
            {field.options?.map(option => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={`${field.id}-${option.value}`} />
                <Label htmlFor={`${field.id}-${option.value}`} className="text-sm">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !value && "text-muted-foreground",
                  error && "border-destructive"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {value ? format(new Date(value), 'PPP') : field.placeholder || 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value ? new Date(value) : undefined}
                onSelect={(date) => onChange(date?.toISOString())}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );

      case 'file':
        return (
          <div className="space-y-2">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <Button variant="outline" size="sm">
                Choose Files
              </Button>
            </div>
            {value && (
              <div className="text-sm text-muted-foreground">
                Selected: {Array.isArray(value) ? `${value.length} files` : value.name || 'File selected'}
              </div>
            )}
          </div>
        );

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={cn(error && "border-destructive")}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      {field.type !== 'checkbox' && (
        <div className="flex items-center gap-2">
          <Label htmlFor={field.id} className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          
          {field.autoPopulate && (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Auto-filled
              {field.autoPopulate.confidence && (
                <span>({Math.round(field.autoPopulate.confidence * 100)}%)</span>
              )}
            </Badge>
          )}
          
          {field.helpText && (
            <div className="group relative">
              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-md shadow-md border opacity-0 group-hover:opacity-100 transition-opacity z-10 w-64">
                {field.helpText}
              </div>
            </div>
          )}
        </div>
      )}

      {renderFieldInput()}

      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {field.helpText && field.type !== 'checkbox' && (
        <p className="text-xs text-muted-foreground">{field.helpText}</p>
      )}
    </div>
  );
};