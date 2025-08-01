import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Database, RefreshCw } from "lucide-react";

interface DataSummary {
  table_name: string;
  count: number;
}

export const DataProvenancePanel = () => {
  const [dataSummary, setDataSummary] = useState<DataSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const { toast } = useToast();

  const fetchDataSummary = async () => {
    setIsLoading(true);
    try {
      // Use any cast until types are updated
      const { data, error } = await (supabase as any).rpc('get_data_summary');
      if (error) throw error;
      setDataSummary((data as DataSummary[]) || []);
    } catch (error) {
      console.error('Error fetching data summary:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performCompletePurge = async () => {
    if (!confirm("Are you sure you want to purge ALL subsidy data? This cannot be undone.")) {
      return;
    }

    setIsPurging(true);
    try {
      // First count records to be deleted
      const { data: beforeCounts, error: countError } = await supabase
        .from('subsidies_structured')
        .select('*', { count: 'exact', head: true });
      
      if (countError) throw countError;

      // Perform the purge using a database function
      const { error } = await (supabase as any).rpc('complete_data_purge');
      if (error) throw error;

      toast({
        title: "Purge Successful",
        description: `${beforeCounts?.length || 0} records purged. All tables are now empty.`,
        variant: "default",
      });

      // Refresh the summary
      await fetchDataSummary();
    } catch (error) {
      console.error('Error during purge:', error);
      toast({
        title: "Purge Failed",
        description: "Failed to purge data. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Provenance & Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={fetchDataSummary} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Data Summary
          </Button>
          <Button 
            onClick={performCompletePurge} 
            disabled={isPurging}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Complete Purge
          </Button>
        </div>

        {dataSummary.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Current Data Summary:</h4>
            {dataSummary.map((item) => (
              <div key={item.table_name} className="flex justify-between items-center p-2 border rounded">
                <span className="font-mono text-sm">{item.table_name}</span>
                <Badge variant={item.count === 0 ? "secondary" : "default"}>
                  {item.count} records
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Data Integrity Status:</strong></p>
          <p>• All records now include provenance fields (scrape_date, extraction_batch_id, import_job_id)</p>
          <p>• Purge operations delete ALL related data to prevent orphaned records</p>
          <p>• New imports will include full traceability metadata</p>
        </div>
      </CardContent>
    </Card>
  );
};