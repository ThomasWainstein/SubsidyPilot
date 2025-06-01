
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Unknown date';
  return new Date(dateString).toLocaleDateString();
};

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    legal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    financial: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    environmental: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
    technical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
    certification: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
    other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
  };
  return colors[category] || colors.other;
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    legal: 'Legal Documents',
    financial: 'Financial Records',
    environmental: 'Environmental Permits',
    technical: 'Technical Documentation',
    certification: 'Certifications',
    other: 'Other',
  };
  return labels[category] || category;
};
