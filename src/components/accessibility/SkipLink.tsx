import React from 'react';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
}

const SkipLink: React.FC<SkipLinkProps> = ({ href, children }) => {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 
                 bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
                 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600
                 font-medium z-50 shadow-lg focus:outline-none focus:ring-2 
                 focus:ring-blue-500 focus:ring-offset-2"
      onFocus={(e) => {
        // Ensure the element is visible when focused
        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }}
    >
      {children}
    </a>
  );
};

export default SkipLink;