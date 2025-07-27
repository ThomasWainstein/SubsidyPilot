import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { SubsidyDataQuality } from '@/utils/subsidyDataQuality';
import { supabase } from '@/integrations/supabase/client';

interface SimpleDataQualityProps {
  className?: string;
}

export const SimpleDataQuality: React.FC<SimpleDataQualityProps> = ({ className }) => {
  const [stats, setStats] = React.useState({
    totalSubsidies: 0,
    missingTitles: 0,
    missingAmounts: 0,
    missingDescriptions: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [improving, setImproving] = React.useState(false);

  React.useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const qualityStats = await SubsidyDataQuality.getDataQualityStats();
      setStats(qualityStats);
    } catch (error) {
      console.error('Failed to load data quality stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const improveTitles = async () => {
    setImproving(true);
    try {
      // Call the edge function to improve titles
      const { data, error } = await supabase.functions.invoke('improve-subsidy-titles');
      
      if (error) throw error;
      
      console.log('Title improvement result:', data);
      
      // Reload stats after improvement
      await loadStats();
    } catch (error) {
      console.error('Failed to improve titles:', error);
    } finally {
      setImproving(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Data Quality Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const qualityScore = Math.round(
    ((stats.totalSubsidies - stats.missingTitles - stats.missingAmounts - stats.missingDescriptions) / 
     (stats.totalSubsidies * 3)) * 100
  );

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Data Quality Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalSubsidies}</div>
            <div className="text-sm text-muted-foreground">Total Subsidies</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{qualityScore}%</div>
            <div className="text-sm text-muted-foreground">Quality Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.missingTitles}</div>
            <div className="text-sm text-muted-foreground">Missing Titles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{stats.missingAmounts}</div>
            <div className="text-sm text-muted-foreground">Missing Amounts</div>
          </div>
        </div>

        {stats.missingTitles > 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="flex justify-between items-center">
                <div>
                  <strong>{stats.missingTitles} subsidies</strong> have placeholder titles that need improvement.
                </div>
                <Button 
                  size="sm" 
                  onClick={improveTitles}
                  disabled={improving}
                  variant="outline"
                >
                  {improving ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Improve Titles
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge variant={stats.missingTitles === 0 ? 'default' : 'destructive'}>
            Titles: {stats.totalSubsidies - stats.missingTitles}/{stats.totalSubsidies}
          </Badge>
          <Badge variant={stats.missingAmounts === 0 ? 'default' : 'destructive'}>
            Amounts: {stats.totalSubsidies - stats.missingAmounts}/{stats.totalSubsidies}
          </Badge>
          <Badge variant={stats.missingDescriptions === 0 ? 'default' : 'destructive'}>
            Descriptions: {stats.totalSubsidies - stats.missingDescriptions}/{stats.totalSubsidies}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};