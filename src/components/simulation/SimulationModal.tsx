
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimulationForm } from './SimulationForm';
import SimulationResults from './SimulationResults';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId?: string;
  subsidyId?: string;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  farmId,
  subsidyId
}) => {
  const [simulationResult, setSimulationResult] = useState<any>(null);

  const handleSimulate = (result: any) => {
    // Transform simulation result into subsidies format expected by SimulationResults
    const mockSubsidies = [
      {
        id: '1',
        name: { en: 'Sample Subsidy Match' },
        description: { en: 'This subsidy matches your simulation criteria' },
        code: 'SIM-001',
        grant: '€50,000',
        region: 'EU',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        matchConfidence: result.eligibilityScore || 75
      }
    ];
    
    setSimulationResult({ subsidies: mockSubsidies, originalResult: result });
  };

  const handleReset = () => {
    setSimulationResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subsidy Application Simulation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {!simulationResult ? (
            <SimulationForm farmId={farmId} onSimulate={handleSimulate} />
          ) : (
            <SimulationResults 
              subsidies={simulationResult.subsidies}
              onReset={handleReset}
              onClose={onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
