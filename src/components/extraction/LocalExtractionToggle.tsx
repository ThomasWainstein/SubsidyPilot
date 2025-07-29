/**
 * Toggle component for enabling/disabling local extraction
 */
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Info, Zap, Cloud } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface LocalExtractionToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  confidenceThreshold: number;
  onConfidenceThresholdChange: (threshold: number) => void;
  isReady: boolean;
  className?: string;
}

const LocalExtractionToggle = ({
  enabled,
  onEnabledChange,
  confidenceThreshold,
  onConfidenceThresholdChange,
  isReady,
  className
}: LocalExtractionToggleProps) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">Local Extraction</CardTitle>
            <Badge variant={isReady ? "secondary" : "destructive"} className="text-xs">
              {isReady ? "Ready" : "Initializing"}
            </Badge>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p>Local extraction processes documents using transformer models running in your browser. 
                It's faster and more private, but may be less accurate than cloud-based extraction.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <CardDescription className="text-xs">
          Try local AI extraction first, fallback to cloud if confidence is low
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Label htmlFor="local-extraction" className="text-sm font-medium">
              Enable Local Extraction
            </Label>
          </div>
          <Switch
            id="local-extraction"
            checked={enabled}
            onCheckedChange={onEnabledChange}
            disabled={!isReady}
          />
        </div>

        {/* Confidence Threshold Slider */}
        {enabled && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Fallback Threshold
              </Label>
              <span className="text-sm text-muted-foreground">
                {(confidenceThreshold * 100).toFixed(0)}%
              </span>
            </div>
            
            <Slider
              value={[confidenceThreshold]}
              onValueChange={(value) => onConfidenceThresholdChange(value[0])}
              min={0.1}
              max={0.95}
              step={0.05}
              className="w-full"
            />
            
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>More local</span>
              <span>More cloud</span>
            </div>
            
            <div className="text-xs text-muted-foreground">
              If local extraction confidence is below {(confidenceThreshold * 100).toFixed(0)}%, 
              the system will automatically use cloud extraction.
            </div>
          </div>
        )}

        {/* Status indicators */}
        <div className="flex justify-between text-xs">
          <div className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span className={enabled ? "text-primary" : "text-muted-foreground"}>
              Local: {enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Cloud className="h-3 w-3" />
            <span className="text-muted-foreground">
              Cloud: Fallback
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocalExtractionToggle;