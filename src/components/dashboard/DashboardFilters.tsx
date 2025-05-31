import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder={t('common.searchFarms')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center">
                {t('dashboard.sortBy')}: {sortOption === 'name' ? t('common.name') : 
                    sortOption === 'region' ? t('common.region') : 
                    sortOption === 'status' ? t('common.status') : 
                    t('common.lastUpdated')}
                <ChevronDown size={16} className="ml-2" />
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
          
          <Button onClick={onAddFarm} className="flex items-center bg-purple-600 hover:bg-purple-700">
            <Plus size={16} className="mr-2" />
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
          <Button variant="ghost" size="sm" className="flex items-center mb-2">
            <SlidersHorizontal size={16} className="mr-2" />
            {isFiltersOpen ? t('common.hideFilters') : t('common.showFilters')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-md">
            <div>
              <h3 className="font-medium mb-3">{t('dashboard.filterByStatus')}</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  {t('dashboard.allFarms')}
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                >
                  {t('status.active')}
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                >
                  {t('status.pending')}
                </Button>
                <Button
                  variant={statusFilter === 'archived' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('archived')}
                >
                  {t('status.archived')}
                </Button>
                <Button
                  variant={statusFilter === 'needsUpdate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('needsUpdate')}
                >
                  {t('status.needsUpdate')}
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">{t('dashboard.filterByRegion')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {uniqueRegions.map((region) => (
                  <div key={region} className="flex items-center space-x-2">
                    <Checkbox
                      id={`region-${region}`}
                      checked={regionFilter.includes(region)}
                      onCheckedChange={() => toggleRegionFilter(region)}
                    />
                    <Label htmlFor={`region-${region}`}>{region}</Label>
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
