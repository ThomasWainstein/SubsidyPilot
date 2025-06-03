
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSubsidies } from '@/hooks/useSubsidies';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Link as LinkIcon } from 'lucide-react';

interface AttachSubsidyModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmId: string;
  onAttach?: (subsidyId: string) => void;
}

export const AttachSubsidyModal: React.FC<AttachSubsidyModalProps> = ({
  isOpen,
  onClose,
  farmId,
  onAttach
}) => {
  const [selectedSubsidyId, setSelectedSubsidyId] = useState('');
  const [notes, setNotes] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);
  const { data: subsidies, isLoading } = useSubsidies();

  const handleAttach = async () => {
    if (!selectedSubsidyId) {
      toast({
        title: 'Error',
        description: 'Please select a subsidy to attach',
        variant: 'destructive'
      });
      return;
    }

    setIsAttaching(true);
    try {
      // Simulate attaching subsidy to farm
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: 'Success',
        description: 'Subsidy attached to farm successfully'
      });
      
      onAttach?.(selectedSubsidyId);
      onClose();
      setSelectedSubsidyId('');
      setNotes('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to attach subsidy',
        variant: 'destructive'
      });
    } finally {
      setIsAttaching(false);
    }
  };

  const getSubsidyTitle = (title: any): string => {
    if (!title) return 'Untitled';
    if (typeof title === 'string') return title;
    if (typeof title === 'object' && title !== null) {
      // Type-safe access to object properties
      const titleObj = title as Record<string, any>;
      return titleObj.en || titleObj.ro || titleObj.fr || titleObj.es || 'Untitled';
    }
    return 'Untitled';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon size={20} />
            Attach Subsidy to Farm
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="subsidy">Select Subsidy</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 p-2">
                <Loader2 className="animate-spin" size={16} />
                <span>Loading subsidies...</span>
              </div>
            ) : (
              <Select value={selectedSubsidyId} onValueChange={setSelectedSubsidyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a subsidy..." />
                </SelectTrigger>
                <SelectContent>
                  {subsidies?.map((subsidy) => (
                    <SelectItem key={subsidy.id} value={subsidy.id}>
                      {getSubsidyTitle(subsidy.title)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this subsidy..."
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleAttach} disabled={isAttaching}>
              {isAttaching ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Attaching...
                </>
              ) : (
                'Attach Subsidy'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
