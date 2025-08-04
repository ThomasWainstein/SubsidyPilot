
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, FilePlus, Save } from 'lucide-react';
import { Subsidy } from '@/types/subsidy';
import MatchConfidenceBadge from '@/components/MatchConfidenceBadge';
import { useToast } from '@/hooks/use-toast';
import { getLocalizedContent } from '@/utils/language';
import { getSubsidyTitle } from '@/utils/subsidyFormatting';

interface SimulationResultsProps {
  subsidies: Subsidy[];
  onReset: () => void;
  onClose: () => void;
}

const SimulationResults = ({ subsidies, onReset, onClose }: SimulationResultsProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  
  const handleSaveHypothetical = () => {
    toast({
      title: t('messages.simulationSaved'),
      description: t('messages.simulationSavedDesc')
    });
    onClose();
  };
  
  const handleDownloadReport = () => {
    toast({
      title: t('messages.documentDownloaded'),
      description: "simulation-report.pdf" + " " + t('messages.documentDownloadedDesc')
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{t('simulation.results.heading')}</h2>
        <Badge variant="outline" className="px-2 py-1">
          {subsidies.length} {t('simulation.results.matchCount')}
        </Badge>
      </div>
      
      <div className="space-y-4">
        {subsidies.map((subsidy) => (
          <Card key={subsidy.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium">
                  {getSubsidyTitle(subsidy)}
                </CardTitle>
                <MatchConfidenceBadge confidence={subsidy.matchConfidence} />
              </div>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-gray-600 mb-2">
                {subsidy.description || 'No description available'}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="bg-blue-50">
                  {subsidy.agency || 'Unknown Agency'}
                </Badge>
                <Badge variant="outline" className="bg-green-50">
                  €{subsidy.amount?.toLocaleString() || 'Amount TBD'}
                </Badge>
                <Badge variant="outline" className="bg-purple-50">
                  {subsidy.region || 'All regions'}
                </Badge>
                {subsidy.deadline && (
                  <Badge variant="outline" className="bg-yellow-50">
                    {t('subsidies.deadline')}: {new Date(subsidy.deadline).toLocaleDateString()}
                  </Badge>
                )}
              </div>
            </CardContent>
            <CardFooter className="pt-2 flex justify-end">
              <Button variant="outline" size="sm">
                {t('subsidies.viewDetails')}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Button variant="outline" onClick={onReset} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('common.back')}
        </Button>
        
        <Button onClick={handleDownloadReport} variant="outline" className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          {t('simulation.results.downloadReport')}
        </Button>
        
        <Button onClick={handleSaveHypothetical} variant="default" className="flex items-center">
          <Save className="mr-2 h-4 w-4" />
          {t('simulation.results.saveFarm')}
        </Button>
        
        <Button onClick={onClose} variant="destructive" className="flex items-center">
          <FilePlus className="mr-2 h-4 w-4" />
          {t('simulation.results.attachToFarm')}
        </Button>
      </div>
    </div>
  );
};

export default SimulationResults;
