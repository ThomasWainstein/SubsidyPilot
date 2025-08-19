
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/language';
import { Save, Trash2, Filter } from 'lucide-react';

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
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterSetName, setFilterSetName] = useState('');

  const handleSaveFilterSet = () => {
    if (filterSetName.trim()) {
      onSaveCurrentFilters(filterSetName.trim());
      setFilterSetName('');
      setShowSaveDialog(false);
    }
  };

  // Check if there are active filters to save
  const hasActiveFilters = Object.values(currentFilters).some((filterValue: any) => {
    if (Array.isArray(filterValue)) {
      return filterValue.length > 0;
    } else if (typeof filterValue === 'string') {
      return filterValue.trim() !== '';
    }
    return false;
  });

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-medium text-foreground truncate flex-1">
          {t('search.filters.savedFilters')}
        </h4>
        <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              disabled={!hasActiveFilters}
              className="text-xs"
            >
              <Save className="w-3 h-3 mr-1" />
              {t('search.filters.save')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('search.filters.saveFilterSet')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder={t('search.filters.enterFilterSetName')}
                value={filterSetName}
                onChange={(e) => setFilterSetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveFilterSet();
                  }
                }}
              />
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowSaveDialog(false)}
                >
                  {t('search.filters.cancel')}
                </Button>
                <Button 
                  onClick={handleSaveFilterSet}
                  disabled={!filterSetName.trim()}
                >
                  {t('search.filters.save')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {filterSets.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2 text-center">
          {t('search.filters.noMatches')}
        </div>
      ) : (
        <div className="space-y-2">
          {filterSets.map((set) => (
            <Card key={set.id} className="border border-border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-medium text-foreground truncate">
                      {set.name}
                    </h5>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <Filter className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">
                        {(Object.values(set.filters) as any[]).reduce((count: number, filterValue: any) => {
                          if (Array.isArray(filterValue)) {
                            return count + filterValue.length;
                          } else if (typeof filterValue === 'string' && filterValue) {
                            return count + 1;
                          }
                          return count;
                        }, 0)} filters
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onApplyFilterSet(set)}
                      className="text-xs px-2 py-1 whitespace-nowrap"
                    >
                      {t('search.filters.apply')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemoveFilterSet(set.id)}
                      className="text-xs px-2 py-1 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedFilterSets;
