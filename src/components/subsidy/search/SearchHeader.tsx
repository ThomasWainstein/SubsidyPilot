import React from 'react';
import { useLanguage } from '@/contexts/language';

const SearchHeader: React.FC = () => {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-bold text-foreground">
        SubsidyPilot Funding Finder
      </h1>
      <p className="text-lg text-muted-foreground">
        Discover €50M+ in grants, subsidies, and funding opportunities for businesses across Europe
      </p>
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