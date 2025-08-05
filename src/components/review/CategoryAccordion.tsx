import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight } from 'lucide-react';
import InlineFieldEditor from './InlineFieldEditor';
import ConfidenceSummary from './ConfidenceSummary';

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

interface CategoryGroup {
  title: string;
  description: string;
  icon: React.ReactNode;
  fields: FieldData[];
}

interface CategoryAccordionProps {
  category: CategoryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onFieldChange: (key: string, value: any) => void;
  onFieldAccept: (key: string) => void;
  onFieldReject: (key: string) => void;
  selectedFields: string[];
  onFieldSelect: (key: string, selected: boolean) => void;
  filterLevel?: 'all' | 'high' | 'medium' | 'low';
  disabled?: boolean;
}

const CategoryAccordion: React.FC<CategoryAccordionProps> = ({
  category,
  isExpanded,
  onToggle,
  onFieldChange,
  onFieldAccept,
  onFieldReject,
  selectedFields,
  onFieldSelect,
  filterLevel = 'all',
  disabled = false
}) => {
  // Filter fields based on confidence level
  const getFilteredFields = () => {
    if (filterLevel === 'all') return category.fields;
    
    return category.fields.filter(field => {
      switch (filterLevel) {
        case 'high':
          return field.confidence >= 0.8;
        case 'medium':
          return field.confidence >= 0.5 && field.confidence < 0.8;
        case 'low':
          return field.confidence < 0.5;
        default:
          return true;
      }
    });
  };

  const filteredFields = getFilteredFields();
  const hasVisibleFields = filteredFields.length > 0;
  
  if (!hasVisibleFields && filterLevel !== 'all') {
    return null; // Don't render category if no fields match filter
  }

  const acceptedFields = filteredFields.filter(f => f.accepted).length;
  const modifiedFields = filteredFields.filter(f => f.modified).length;
  const totalFields = filteredFields.length;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className="border rounded-lg mb-4 overflow-hidden">
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full px-4 py-3 text-left flex justify-between items-center hover:bg-gray-50 h-auto"
            disabled={disabled}
            aria-expanded={isExpanded}
            aria-controls={`category-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${category.title} category`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {category.icon}
                <span className="font-medium">{category.title}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {totalFields} field{totalFields !== 1 ? 's' : ''}
                </Badge>
                
                {acceptedFields > 0 && (
                  <Badge variant="default" className="text-xs bg-green-600">
                    {acceptedFields} accepted
                  </Badge>
                )}
                
                {modifiedFields > 0 && (
                  <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
                    {modifiedFields} modified
                  </Badge>
                )}
                
                <ConfidenceSummary fields={filteredFields} />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {filterLevel !== 'all' && (
                <Badge variant="outline" className="text-xs capitalize">
                  {filterLevel} confidence
                </Badge>
              )}
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div 
            className="border-t bg-gray-50/50"
            id={`category-${category.title.toLowerCase().replace(/\s+/g, '-')}`}
            role="region"
            aria-labelledby={`category-${category.title.toLowerCase().replace(/\s+/g, '-')}-header`}
          >
            {/* Category Description */}
            {category.description && (
              <div className="px-4 py-2 text-sm text-muted-foreground border-b">
                {category.description}
              </div>
            )}
            
            {/* Fields */}
            <div className="p-4 space-y-3">
              {hasVisibleFields ? (
                filteredFields.map((field) => (
                  <InlineFieldEditor
                    key={field.key}
                    field={field}
                    value={field.value}
                    onChange={onFieldChange}
                    onAccept={onFieldAccept}
                    onReject={onFieldReject}
                    disabled={disabled}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No fields found in this category</p>
                  {filterLevel !== 'all' && (
                    <p className="text-xs mt-1">
                      Try adjusting the confidence filter to see more fields
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default CategoryAccordion;