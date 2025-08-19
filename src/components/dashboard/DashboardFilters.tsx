
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
              placeholder="Search your farms..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search your farms"
            />
        </div>
        
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center"
                aria-label={`Sort farms by: ${sortOption === 'name' ? 'Name' : 
                    sortOption === 'region' ? 'Region' : 
                    sortOption === 'status' ? 'Status' : 
                    'Last Updated'}`}
              >
                Sort by: {sortOption === 'name' ? 'Name' : 
                    sortOption === 'region' ? 'Region' : 
                    sortOption === 'status' ? 'Status' : 
                    'Last Updated'}
                <ChevronDown size={16} className="ml-2" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value)}>
                <DropdownMenuRadioItem value="name">Name</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="region">Region</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="updated">Last Updated</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            onClick={onAddFarm} 
            className="flex items-center bg-primary hover:bg-primary/90"
            aria-label="Add New Farm"
          >
            <Plus size={16} className="mr-2" aria-hidden="true" />
            Add New Farm
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
            aria-label={isFiltersOpen ? 'Hide filters' : 'Show filters'}
          >
            <SlidersHorizontal size={16} className="mr-2" aria-hidden="true" />
            {isFiltersOpen ? 'Hide filters' : 'Show filters'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent id="dashboard-filters-content">
          <div 
            className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-md"
            role="region"
            aria-label="Farm filtering options"
          >
            <div>
              <h3 className="font-medium mb-3" id="status-filter-label">Filter by Status</h3>
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
                  aria-label={`Filter by: All Farms`}
                >
                  All Farms
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('active')}
                  role="radio"
                  aria-checked={statusFilter === 'active'}
                  aria-label={`Filter by: Active`}
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  role="radio"
                  aria-checked={statusFilter === 'pending'}
                  aria-label={`Filter by: Pending`}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'archived' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('archived')}
                  role="radio"
                  aria-checked={statusFilter === 'archived'}
                  aria-label={`Filter by: Archived`}
                >
                  Archived
                </Button>
                <Button
                  variant={statusFilter === 'needsUpdate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('needsUpdate')}
                  role="radio"
                  aria-checked={statusFilter === 'needsUpdate'}
                  aria-label={`Filter by: Needs Update`}
                >
                  Needs Update
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3" id="region-filter-label">Filter by Region</h3>
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
