/**
 * Component to show AI category suggestions during upload
 */
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, CheckCircle, X } from 'lucide-react';
import { ClassificationResult } from '@/services/documentClassification';

interface CategorySuggestionProps {
  classification: ClassificationResult | null;
  userSelectedCategory: string;
  onAcceptSuggestion: (category: string) => void;
  onDismiss: () => void;
  isVisible: boolean;
}

export const CategorySuggestion = ({
  classification,
  userSelectedCategory,
  onAcceptSuggestion,
  onDismiss,
  isVisible
}: CategorySuggestionProps) => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    setIsDismissed(false);
  }, [classification]);

  if (!classification || !isVisible || isDismissed) {
    return null;
  }

  const isDisagreement = classification.category !== userSelectedCategory;
  const isHighConfidence = classification.confidence > 0.7;

  // Only show suggestions for disagreements with high confidence
  if (!isDisagreement || !isHighConfidence) {
    return null;
  }

  const handleAccept = () => {
    onAcceptSuggestion(classification.category);
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss();
  };

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Brain className="h-4 w-4 text-blue-600" />
      <AlertDescription className="space-y-3">
        <div>
          <div className="font-medium text-blue-900 mb-1">
            AI Category Suggestion
          </div>
          <div className="text-sm text-blue-800">
            Our AI suggests this document might be{' '}
            <Badge variant="secondary" className="mx-1">
              {classification.category}
            </Badge>
            instead of{' '}
            <Badge variant="outline" className="mx-1">
              {userSelectedCategory}
            </Badge>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            Confidence: {Math.round(classification.confidence * 100)}%
          </div>
        </div>

        {/* Alternative suggestions */}
        {classification.alternatives.length > 0 && (
          <div className="text-xs">
            <div className="text-blue-700 mb-1">Other possibilities:</div>
            <div className="flex gap-1 flex-wrap">
              {classification.alternatives.slice(0, 3).map((alt, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {alt.category} ({Math.round(alt.confidence * 100)}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleAccept}
            className="h-7 text-xs"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Use "{classification.category}"
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDismiss}
            className="h-7 text-xs"
          >
            <X className="w-3 h-3 mr-1" />
            Keep "{userSelectedCategory}"
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};