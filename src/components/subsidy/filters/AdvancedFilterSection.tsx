// Advanced Filter Section Component with Tooltips and Array Support

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedFilterState, FilterOption, FilterMetadata } from '@/hooks/useAdvancedFiltering';

interface AdvancedFilterSectionProps {
  title: string;
  filterKey: keyof AdvancedFilterState;
  metadata: FilterMetadata;
  currentValue: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  farmProfile?: any;
}

const AdvancedFilterSection: React.FC<AdvancedFilterSectionProps> = ({
  title,
  filterKey,
  metadata,
  currentValue,
  onChange,
  disabled = false,
  farmProfile
}) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(true);

  const renderMultiSelectFilter = () => {
    const selectedValues = Array.isArray(currentValue) ? currentValue : [];
    
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {metadata.options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            const isExcluded = checkIfExcluded(option, selectedValues, farmProfile);
            const isRecommended = checkIfRecommended(option, farmProfile);
            
            return (
              <TooltipProvider key={option.value}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      disabled={disabled || isExcluded}
                      className={cn(
                        "relative",
                        isSelected && "bg-primary text-primary-foreground",
                        isExcluded && "opacity-50 cursor-not-allowed",
                        isRecommended && !isSelected && "border-green-500 border-2"
                      )}
                      onClick={() => {
                        if (isExcluded) return;
                        
                        const newValues = isSelected
                          ? selectedValues.filter(v => v !== option.value)
                          : [...selectedValues, option.value];
                        onChange(newValues);
                      }}
                    >
                      {option.label}
                      {option.count && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {option.count}
                        </Badge>
                      )}
                      {isSelected && <X className="ml-2 h-3 w-3" />}
                      {isRecommended && !isSelected && (
                        <CheckCircle2 className="ml-1 h-3 w-3 text-green-500" />
                      )}
                      {isExcluded && (
                        <AlertTriangle className="ml-1 h-3 w-3 text-red-500" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{option.label}</p>
                      {option.tooltip && <p className="text-sm">{option.tooltip}</p>}
                      {option.count && (
                        <p className="text-xs text-muted-foreground">
                          {option.count} subsidies available
                        </p>
                      )}
                      {isExcluded && (
                        <p className="text-xs text-red-500">
                          Not compatible with your farm profile
                        </p>
                      )}
                      {isRecommended && (
                        <p className="text-xs text-green-600">
                          Recommended based on your farm
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
        
        {selectedValues.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedValues.length} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderRangeFilter = () => {
    const [min, max] = Array.isArray(currentValue) ? currentValue : [0, 100];
    const constraints = metadata.constraints || {};
    const minLimit = constraints.min || 0;
    const maxLimit = constraints.max || 1000000;
    
    return (
      <div className="space-y-4">
        <div className="px-2">
          <Slider
            value={[min, max]}
            onValueChange={(newValue) => onChange(newValue)}
            min={minLimit}
            max={maxLimit}
            step={filterKey === 'amountRange' ? 1000 : 1}
            disabled={disabled}
            className="w-full"
          />
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            {filterKey === 'amountRange' ? `€${min.toLocaleString()}` : `${min}%`}
          </span>
          <span>
            {filterKey === 'amountRange' ? `€${max.toLocaleString()}` : `${max}%`}
          </span>
        </div>
        {constraints.min !== undefined && constraints.max !== undefined && (
          <p className="text-xs text-muted-foreground">
            Range: {filterKey === 'amountRange' ? '€' : ''}{constraints.min.toLocaleString()} - {filterKey === 'amountRange' ? '€' : ''}{constraints.max.toLocaleString()}{filterKey !== 'amountRange' ? '%' : ''}
          </p>
        )}
      </div>
    );
  };

  const renderSingleSelectFilter = () => {
    return (
      <div className="space-y-2">
        {metadata.options.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <Checkbox
              id={`${filterKey}-${option.value}`}
              checked={currentValue === option.value}
              onCheckedChange={(checked) => {
                onChange(checked ? option.value : null);
              }}
              disabled={disabled}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <label
                    htmlFor={`${filterKey}-${option.value}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1"
                  >
                    {option.label}
                    {option.tooltip && <Info className="h-3 w-3 text-muted-foreground" />}
                  </label>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{option.tooltip || option.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
    );
  };

  const renderBooleanFilter = () => {
    return (
      <div className="flex items-center space-x-2">
        <Switch
          checked={currentValue === true}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={disabled}
        />
        <label className="text-sm font-medium">
          {title}
        </label>
        {metadata.tooltip && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{metadata.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  };

  const renderFilterContent = () => {
    switch (metadata.type) {
      case 'multiselect':
        return renderMultiSelectFilter();
      case 'range':
        return renderRangeFilter();
      case 'single':
        return renderSingleSelectFilter();
      case 'boolean':
        return renderBooleanFilter();
      default:
        return null;
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm">{title}</h3>
          {metadata.tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>{metadata.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? '−' : '+'}
        </Button>
      </div>
      
      {isExpanded && (
        <div className="pt-2">
          {renderFilterContent()}
        </div>
      )}
    </div>
  );
};

/**
 * Check if an option should be excluded based on farm profile
 */
function checkIfExcluded(option: FilterOption, selectedValues: string[], farmProfile: any): boolean {
  if (!farmProfile || !option.exclusions) return false;
  
  // Check if farm profile has any excluding characteristics
  const farmLegalStatus = farmProfile.legal_status;
  const farmSize = farmProfile.total_hectares;
  
  return option.exclusions.some(exclusion => {
    // Simple exclusion logic - can be extended
    if (exclusion === farmLegalStatus) return true;
    if (exclusion === 'large_farm' && farmSize > 50) return true;
    if (exclusion === 'small_farm' && farmSize < 10) return true;
    return false;
  });
}

/**
 * Check if an option is recommended based on farm profile
 */
function checkIfRecommended(option: FilterOption, farmProfile: any): boolean {
  if (!farmProfile) return false;
  
  // Simple recommendation logic based on farm characteristics
  const farmRegion = farmProfile.department;
  const farmSectors = farmProfile.land_use_types || [];
  
  if (option.category === 'region' && option.value === farmRegion) return true;
  if (option.category === 'sector' && farmSectors.includes(option.value)) return true;
  
  return false;
}

export default AdvancedFilterSection;