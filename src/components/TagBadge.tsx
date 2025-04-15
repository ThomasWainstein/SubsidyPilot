
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: string;
  className?: string;
}

const TagBadge = ({ tag, className }: TagBadgeProps) => {
  const getTagColor = (tag: string) => {
    const tagLower = tag.toLowerCase();
    
    // Enhanced dark mode color scheme
    if (tagLower.includes('organic')) return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-50';
    if (tagLower.includes('biodiversity')) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-50';
    if (tagLower.includes('vineyard')) return 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-50';
    if (tagLower.includes('precision')) return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-50';
    if (tagLower.includes('carbon')) return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-50';
    if (tagLower.includes('irrigation')) return 'bg-sky-100 text-sky-800 dark:bg-sky-800 dark:text-sky-50';
    if (tagLower.includes('solar')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-50';
    if (tagLower.includes('livestock')) return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-50';
    if (tagLower.includes('rotation')) return 'bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-50';
    if (tagLower.includes('compost')) return 'bg-lime-100 text-lime-800 dark:bg-lime-800 dark:text-lime-50';
    if (tagLower.includes('sustainability')) return 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-50';
    if (tagLower.includes('soil')) return 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-50';
    if (tagLower.includes('certification')) return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-50';
    if (tagLower.includes('planning')) return 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-50';
    if (tagLower.includes('technology')) return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-800 dark:text-cyan-50';
    if (tagLower.includes('analysis')) return 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-50';
    if (tagLower.includes('energy')) return 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-50';
    if (tagLower.includes('inventory')) return 'bg-teal-100 text-teal-800 dark:bg-teal-800 dark:text-teal-50';
    
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-50';
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors duration-300',
        getTagColor(tag),
        className
      )}
    >
      {tag}
    </span>
  );
};

export default TagBadge;
