import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Edit3, 
  Save, 
  X, 
  CalendarIcon,
  Plus,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ConfidenceBadge from './ConfidenceBadge';

interface FieldData {
  key: string;
  label: string;
  value: any;
  confidence: number;
  type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'email' | 'url' | 'textarea';
  category: string;
  accepted?: boolean;
  modified?: boolean;
  placeholder?: string;
  options?: string[];
}

interface InlineFieldEditorProps {
  field: FieldData;
  value: any;
  onChange: (key: string, value: any) => void;
  onAccept: (key: string) => void;
  onReject: (key: string) => void;
  disabled?: boolean;
}

const InlineFieldEditor: React.FC<InlineFieldEditorProps> = ({
  field,
  value,
  onChange,
  onAccept,
  onReject,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    onChange(field.key, localValue);
    setIsEditing(false);
    setHasChanges(true);
  };

  const handleRevert = () => {
    setLocalValue(value);
    setIsEditing(false);
    setHasChanges(false);
  };

  const handleAcceptToggle = (checked: boolean) => {
    if (checked) {
      onAccept(field.key);
    } else {
      onReject(field.key);
    }
  };

  const formatFieldValue = (val: any, type: string) => {
    if (val === null || val === undefined || val === '') return 'No value';
    
    switch (type) {
      case 'date':
        try {
          return format(new Date(val), 'PPP');
        } catch {
          return val.toString();
        }
      case 'boolean':
        return val ? 'Yes' : 'No';
      case 'array':
        return Array.isArray(val) ? val.join(', ') : val.toString();
      case 'number':
        return typeof val === 'number' ? val.toLocaleString() : val.toString();
      default:
        return val.toString();
    }
  };

  const renderFieldInput = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={field.placeholder}
            className="min-h-[80px]"
            disabled={disabled}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value ? Number(e.target.value) : '')}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );

      case 'date':
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !localValue && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {localValue ? format(new Date(localValue), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={localValue ? new Date(localValue) : undefined}
                onSelect={(date) => setLocalValue(date?.toISOString())}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={Boolean(localValue)}
              onCheckedChange={setLocalValue}
              disabled={disabled}
            />
            <span className="text-sm">
              {Boolean(localValue) ? 'Yes' : 'No'}
            </span>
          </div>
        );

      case 'array':
        const arrayValue = Array.isArray(localValue) ? localValue : [];
        return (
          <ArrayEditor
            value={arrayValue}
            onChange={setLocalValue}
            disabled={disabled}
            placeholder={field.placeholder}
          />
        );

      default:
        if (field.options) {
          return (
            <Select 
              value={localValue || ''} 
              onValueChange={setLocalValue}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={field.placeholder || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        
        return (
          <Input
            type="text"
            value={localValue || ''}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={field.placeholder}
            disabled={disabled}
          />
        );
    }
  };

  return (
    <div className={cn(
      "flex items-start space-x-3 p-4 border rounded-lg transition-all",
      field.accepted ? "border-green-200 bg-green-50" : "border-gray-200 hover:shadow-sm",
      hasChanges && "border-blue-200 bg-blue-50"
    )}>
      <div className="mt-1">
        <Checkbox 
          checked={field.accepted || false}
          onCheckedChange={handleAcceptToggle}
          disabled={disabled}
          aria-label={`Accept ${field.label}`}
        />
      </div>
      
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-900">
            {field.label}
          </label>
          <div className="flex items-center space-x-2">
            <ConfidenceBadge 
              confidence={field.confidence} 
              field={field.label}
              size="sm"
            />
            {hasChanges && (
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                Modified
              </Badge>
            )}
          </div>
        </div>
        
        {isEditing ? (
          <div className="space-y-3">
            {renderFieldInput()}
            <div className="flex items-center space-x-2">
              <Button 
                size="sm" 
                onClick={handleSave}
                disabled={disabled}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleRevert}
                disabled={disabled}
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between group">
            <div className="flex-1">
              <p className={cn(
                "text-sm",
                hasChanges ? "text-blue-700 font-medium" : "text-gray-700",
                field.accepted ? "text-green-700" : ""
              )}>
                {formatFieldValue(localValue, field.type)}
              </p>
              {field.type === 'array' && Array.isArray(localValue) && localValue.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {localValue.slice(0, 5).map((item, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                  {localValue.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{localValue.length - 5} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => setIsEditing(true)}
              disabled={disabled}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// Array Editor Component
interface ArrayEditorProps {
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ArrayEditor: React.FC<ArrayEditorProps> = ({ 
  value, 
  onChange, 
  disabled = false,
  placeholder = "Add item"
}) => {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim() && !value.includes(newItem.trim())) {
      onChange([...value, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <Badge key={index} variant="secondary" className="flex items-center space-x-1">
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={disabled}
              className="ml-1 hover:bg-red-100 rounded-full p-0.5"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="button"
          size="sm"
          onClick={addItem}
          disabled={disabled || !newItem.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default InlineFieldEditor;