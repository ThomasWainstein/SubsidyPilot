import React from 'react';
import { useLanguage } from '@/contexts/language';

interface SearchHeaderProps {
  subsidyCount?: number;
  lastUpdated?: Date;
  loading?: boolean;
}

const SearchHeader: React.FC<SearchHeaderProps> = ({ 
  subsidyCount, 
  lastUpdated, 
  loading 
}) => {
  const { t } = useLanguage();
  
  const getLastUpdatedText = () => {
    if (!lastUpdated) return 'Recently updated';
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Updated just now';
    if (diffInHours < 24) return `Updated ${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Updated yesterday';
    if (diffInDays < 7) return `Updated ${diffInDays} days ago`;
    
    return `Updated ${lastUpdated.toLocaleDateString()}`;
  };
  
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
            <div className="text-sm text-muted-foreground">
              {getLastUpdatedText()}
            </div>
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