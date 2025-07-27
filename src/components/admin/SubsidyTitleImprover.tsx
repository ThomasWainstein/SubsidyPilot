import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const SubsidyTitleImprover: React.FC = () => {
  const [isImproving, setIsImproving] = useState(false);
  const [results, setResults] = useState<{
    updatedCount: number;
    totalFound: number;
  } | null>(null);
  const { toast } = useToast();

  const improveTitles = async () => {
    setIsImproving(true);
    setResults(null);

    try {
      const { data, error } = await supabase.functions.invoke('improve-subsidy-titles');

      if (error) {
        throw error;
      }

      if (data.success) {
        setResults({
          updatedCount: data.updatedCount,
          totalFound: data.totalFound
        });

        toast({
          title: "Success",
          description: `Updated ${data.updatedCount} subsidy titles`,
        });
      } else {
        throw new Error(data.error || 'Failed to improve titles');
      }
    } catch (error) {
      console.error('Error improving titles:', error);
      toast({
        title: "Error",
        description: "Failed to improve subsidy titles. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Subsidy Title Improvement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <p>
            This tool improves placeholder subsidy titles like "Subsidy Page" by generating 
            better names based on agency, sector, and funding type information.
          </p>
        </div>

        {results && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">
                Title Improvement Complete
              </span>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <Badge variant="secondary">{results.totalFound}</Badge> subsidies found with placeholder titles
              </p>
              <p>
                <Badge variant="default">{results.updatedCount}</Badge> titles successfully updated
              </p>
            </div>
          </div>
        )}

        <Button 
          onClick={improveTitles}
          disabled={isImproving}
          className="w-full"
        >
          {isImproving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Improving Titles...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Improve Placeholder Titles
            </>
          )}
        </Button>

        <div className="text-xs text-gray-500">
          <p>
            This operation is safe and only updates subsidies with "Subsidy Page" as the title.
            Existing meaningful titles will not be modified.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubsidyTitleImprover;