
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, SearchIcon, SlidersHorizontal } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface DashboardFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOption: string;
  setSortOption: (option: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  regionFilter: string[];
  toggleRegionFilter: (region: string) => void;
  uniqueRegions: string[];
  onAddFarm: () => void;
}

const DashboardFilters = ({
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  statusFilter,
  setStatusFilter,
  regionFilter,
  toggleRegionFilter,
  uniqueRegions,
  onAddFarm,
}: DashboardFiltersProps) => {
  const { t } = useLanguage();
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <SearchIcon 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" 
            size={18} 
            aria-hidden="true"
          />
          <Input
            placeholder={t('common.searchFarms')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label={t('common.searchFarms')}
          />
        </div>
        
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center"
                aria-label={`Sort farms by: ${sortOption === 'name' ? t('common.name') : 
                    sortOption === 'region' ? t('common.region') : 
                    sortOption === 'status' ? t('common.status') : 
                    t('common.lastUpdated')}`}
              >
                {t('dashboard.sortBy')}: {sortOption === 'name' ? t('common.name') : 
                    sortOption === 'region' ? t('common.region') : 
                    sortOption === 'status' ? t('common.status') : 
                    t('common.lastUpdated')}
                <ChevronDown size={16} className="ml-2" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('dashboard.sortBy')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value)}>
                <DropdownMenuRadioItem value="name">{t('common.name')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="region">{t('common.region')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="status">{t('common.status')}</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="updated">{t('common.lastUpdated')}</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={onAddFarm} 
            className="flex items-center bg-purple-600 hover:bg-purple-700"
            aria-label={t('common.addNewClientFarm')}
          >
            <Plus size={16} className="mr-2" aria-hidden="true" />
            {t('common.addNewClientFarm')}
          </Button>
        </div>
      </div>
      
      <Collapsible
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        className="mt-4"
      >
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center mb-2"
            aria-expanded={isFiltersOpen}
            aria-controls="dashboard-filters-content"
            aria-label={isFiltersOpen ? t('common.hideFilters') : t('common.showFilters')}
          >
            <SlidersHorizontal size={16} className="mr-2" aria-hidden="true" />
            {isFiltersOpen ? t('common.hideFilters') : t('common.showFilters')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent id="dashboard-filters-content">
          <div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-md"
            role="region"
            aria-label="Farm filtering options"
          >
            <div>
              <h3 className="font-medium mb-3" id="status-filter-label">{t('dashboard.filterByStatus')}</h3>
              <div 
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-labelledby="status-filter-label"
              >
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  role="radio"
                  aria-checked={statusFilter === 'all'}
                  aria-label={`Filter by: ${t('dashboard.allFarms')}`}
                >
                  {t('dashboard.allFarms')}
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  role="radio"
                  aria-checked={statusFilter === 'active'}
                  aria-label={`Filter by: ${t('status.active')}`}
                >
                  {t('status.active')}
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  role="radio"
                  aria-checked={statusFilter === 'pending'}
                  aria-label={`Filter by: ${t('status.pending')}`}
                >
                  {t('status.pending')}
                </Button>
                <Button
                  variant={statusFilter === 'archived' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('archived')}
                  role="radio"
                  aria-checked={statusFilter === 'archived'}
                  aria-label={`Filter by: ${t('status.archived')}`}
                >
                  {t('status.archived')}
                </Button>
                <Button
                  variant={statusFilter === 'needsUpdate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('needsUpdate')}
                  role="radio"
                  aria-checked={statusFilter === 'needsUpdate'}
                  aria-label={`Filter by: ${t('status.needsUpdate')}`}
                >
                  {t('status.needsUpdate')}
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3" id="region-filter-label">{t('dashboard.filterByRegion')}</h3>
              <div 
                className="grid grid-cols-2 gap-2"
                role="group"
                aria-labelledby="region-filter-label"
              >
                {uniqueRegions.map((region) => (
                  <div key={region} className="flex items-center space-x-2">
                    <Checkbox
                      id={`region-${region}`}
                      checked={regionFilter.includes(region)}
                      onCheckedChange={() => toggleRegionFilter(region)}
                      aria-describedby={`region-${region}-label`}
                    />
                    <Label 
                      htmlFor={`region-${region}`}
                      id={`region-${region}-label`}
                      className="text-sm cursor-pointer"
                    >
                      {region}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Separator className="my-4" />
        </CollapsibleContent>
      </Collapsible>
    </>
  );
};

export default DashboardFilters;
