import React from 'react';
import { useLanguage } from '@/contexts/language';

interface SearchHeaderProps {
  subsidyCount?: number;
  totalFunding?: number;
  loading?: boolean;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({ 
  subsidyCount, 
  totalFunding, 
  loading 
}) => {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            SubsidyPilot Funding Finder
          </h1>
          <p className="text-lg text-muted-foreground">
            Discover grants, subsidies, and funding opportunities for businesses across Europe
          </p>
        </div>
        {!loading && subsidyCount !== undefined && (
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {subsidyCount} opportunities
            </div>
            {totalFunding && totalFunding > 0 && (
              <div className="text-sm text-muted-foreground">
                €{totalFunding.toLocaleString()} total funding
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span>✓ Verified by Government & EU Authorities</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <span>89% of businesses receive funding through our platform</span>
        </div>
      </div>
    </div>
  );
};

export default SearchHeader;