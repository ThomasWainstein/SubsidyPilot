
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
    setSimulationResult(result);
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
            <div className="space-y-4">
              <SimulationResults result={simulationResult} />
              <div className="flex gap-2">
                <button
                  onClick={() => setSimulationResult(null)}
                  className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Run Another Simulation
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm bg-purple-600 text-white hover:bg-purple-700 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
