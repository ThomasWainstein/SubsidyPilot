import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, Clock, Zap } from 'lucide-react';
import { getCostComparison } from '@/lib/services/unified-extraction-service';

interface CostComparisonCardProps {
  documentPages?: number;
  tokensEstimate?: number;
  className?: string;
}

export const CostComparisonCard = ({ 
  documentPages = 1, 
  tokensEstimate = 3000,
  className 
}: CostComparisonCardProps) => {
  const comparison = getCostComparison(documentPages, tokensEstimate);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-green-600" />
          Cost Comparison: Hybrid vs Pure OpenAI
        </CardTitle>
        <CardDescription>
          Compare extraction costs between hybrid OCR and pure OpenAI approaches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hybrid Approach */}
        <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Hybrid (Google Vision + OpenAI)
            </h3>
            <Badge variant="outline" className="text-green-700 dark:text-green-300">
              Recommended
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Google Vision OCR:</span>
              <span>${comparison.hybrid.googleVision.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>OpenAI Field Mapping:</span>
              <span>${comparison.hybrid.openai.toFixed(4)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Cost:</span>
              <span className="text-green-600">${comparison.hybrid.total.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Pure OpenAI Approach */}
        <div className="border rounded-lg p-4 bg-orange-50 dark:bg-orange-950/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-orange-800 dark:text-orange-200 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pure OpenAI
            </h3>
            <Badge variant="outline" className="text-orange-700 dark:text-orange-300">
              Higher Cost
            </Badge>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>OpenAI (OCR + Extraction):</span>
              <span>${comparison.pureOpenAI.openai.toFixed(4)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Cost:</span>
              <span className="text-orange-600">${comparison.pureOpenAI.total.toFixed(4)}</span>
            </div>
          </div>
        </div>

        {/* Savings Summary */}
        <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Cost Savings
            </h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Savings per document:</span>
              <span className="text-blue-600 font-semibold">
                ${comparison.savings.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Percentage savings:</span>
              <span className="text-blue-600 font-semibold">
                {comparison.savingsPercentage.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Benefits List */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Hybrid Benefits:</strong></p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Up to {comparison.savingsPercentage.toFixed(0)}% cost reduction</li>
            <li>Superior OCR accuracy with Google Vision</li>
            <li>Intelligent field mapping with OpenAI</li>
            <li>Works with all document types (not just agricultural)</li>
            <li>Better scalability for high-volume processing</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};