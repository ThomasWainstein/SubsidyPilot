
import React from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export interface FilterSet {
  id: string;
  name: string;
  filters: any;
}

interface SavedFilterSetsProps {
  filterSets: FilterSet[];
  onApplyFilterSet: (set: FilterSet) => void;
  onRemoveFilterSet: (id: string) => void;
  currentFilters: any;
  onSaveCurrentFilters: (name: string) => void;
}

const SavedFilterSets: React.FC<SavedFilterSetsProps> = ({
  filterSets,
  onApplyFilterSet,
  onRemoveFilterSet,
  currentFilters,
  onSaveCurrentFilters
}) => {
  const { t } = useLanguage();
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [filterSetName, setFilterSetName] = React.useState('');
  
  // Check if we have any active filters
  const hasActiveFilters = Object.values(currentFilters).some(value => 
    (Array.isArray(value) && value.length > 0) || 
    (typeof value === 'string' && value)
  );

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">{t('search.filters.savedFilters')}</h3>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          disabled={!hasActiveFilters}
          onClick={() => setSaveDialogOpen(true)}
        >
          {t('search.filters.saveFilterSet')}
        </Button>
      </div>
      
      {filterSets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filterSets.map(set => (
            <Badge
              key={set.id}
              variant="outline"
              className="px-3 py-1 cursor-pointer hover:bg-gray-100 flex items-center gap-1"
            >
              <span onClick={() => onApplyFilterSet(set)}>{set.name}</span>
              <X
                className="h-3 w-3 hover:text-red-500"
                onClick={() => onRemoveFilterSet(set.id)}
              />
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500">{t('search.filters.noMatches')}</p>
      )}
      
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogTitle>{t('search.filters.saveFilterSet')}</DialogTitle>
          <div className="py-4">
            <Input
              placeholder={t('search.filters.enterFilterSetName')}
              value={filterSetName}
              onChange={(e) => setFilterSetName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              {t('search.filters.cancel')}
            </Button>
            <Button 
              onClick={() => {
                if (filterSetName.trim()) {
                  onSaveCurrentFilters(filterSetName);
                  setFilterSetName('');
                  setSaveDialogOpen(false);
                }
              }}
              disabled={!filterSetName.trim()}
            >
              {t('search.filters.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SavedFilterSets;
