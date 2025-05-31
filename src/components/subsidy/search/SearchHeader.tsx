
import React from 'react';

const SearchHeader: React.FC = () => {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        European Subsidy Search Engine
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        Find available subsidies for your farms
      </p>
    </div>
  );
};

export default SearchHeader;
