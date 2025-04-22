
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Upload, MessageSquare } from 'lucide-react';
import SimulationForm from './SimulationForm';
import SimulationUpload from './SimulationUpload';
import SimulationChat from './SimulationChat';
import SimulationResults from './SimulationResults';
import { Subsidy } from '@/data/subsidies';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SimulationModal = ({ isOpen, onClose }: SimulationModalProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('form');
  const [showResults, setShowResults] = useState(false);
  const [matchingSubsidies, setMatchingSubsidies] = useState<Subsidy[]>([]);

  const handleShowResults = (subsidies: Subsidy[]) => {
    setMatchingSubsidies(subsidies);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
  };

  const handleClose = () => {
    setShowResults(false);
    setActiveTab('form');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('simulation.title')}</DialogTitle>
          <DialogDescription>
            {t('simulation.description')}
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <Tabs defaultValue="form" value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="form" className="flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                {t('simulation.tabs.form')}
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                {t('simulation.tabs.upload')}
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex items-center">
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('simulation.tabs.chat')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="form">
              <SimulationForm onShowResults={handleShowResults} />
            </TabsContent>
            
            <TabsContent value="upload">
              <SimulationUpload onShowResults={handleShowResults} />
            </TabsContent>
            
            <TabsContent value="chat">
              <SimulationChat onShowResults={handleShowResults} />
            </TabsContent>
          </Tabs>
        ) : (
          <SimulationResults 
            subsidies={matchingSubsidies} 
            onReset={handleReset} 
            onClose={handleClose}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SimulationModal;
