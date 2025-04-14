
import React from 'react';
import { Plus, Search, SortAsc, Filter } from 'lucide-react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

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
  onAddFarm
}: DashboardFiltersProps) => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full">
          <div className="relative flex-1 md:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search client farms..."
              className="pl-10 w-full md:w-auto"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-48">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder={t('dashboard.filterByStatus')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('dashboard.allFarms')}</SelectItem>
              <SelectItem value="In Review">{t('status.inReview')}</SelectItem>
              <SelectItem value="Needs Update">{t('status.needsUpdate')}</SelectItem>
              <SelectItem value="Profile Complete">{t('status.profileComplete')}</SelectItem>
              <SelectItem value="Subsidy In Progress">{t('status.subsidyInProgress')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-full md:w-48">
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4" />
                <SelectValue placeholder={t('dashboard.sortBy')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="region">Region</SelectItem>
              <SelectItem value="updated">Last Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button onClick={onAddFarm}>
          <Plus size={18} className="mr-2" />
          {t('common.addNewClientFarm')}
        </Button>
      </div>
      
      {uniqueRegions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {uniqueRegions.map(region => (
            <Badge 
              key={region}
              variant={regionFilter.includes(region) ? "default" : "outline"} 
              className="cursor-pointer"
              onClick={() => toggleRegionFilter(region)}
            >
              {region}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardFilters;
