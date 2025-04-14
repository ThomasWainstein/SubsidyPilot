
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: string;
  className?: string;
}

const TagBadge = ({ tag, className }: TagBadgeProps) => {
  // Get color based on tag
  const getTagColor = (tag: string) => {
    // Convert tag to lowercase for case-insensitive matching
    const tagLower = tag.toLowerCase();
    
    // Softer, more muted color palette
    if (tagLower.includes('organic')) return 'bg-green-100 text-green-800';
    if (tagLower.includes('biodiversity')) return 'bg-emerald-100 text-emerald-800';
    if (tagLower.includes('vineyard')) return 'bg-amber-100 text-amber-800';
    if (tagLower.includes('precision')) return 'bg-blue-100 text-blue-800';
    if (tagLower.includes('carbon')) return 'bg-slate-100 text-slate-800';
    if (tagLower.includes('irrigation')) return 'bg-sky-100 text-sky-800';
    if (tagLower.includes('solar')) return 'bg-yellow-100 text-yellow-800';
    if (tagLower.includes('livestock')) return 'bg-orange-100 text-orange-800';
    if (tagLower.includes('rotation')) return 'bg-stone-100 text-stone-800';
    if (tagLower.includes('compost')) return 'bg-lime-100 text-lime-800';
    if (tagLower.includes('sustainability')) return 'bg-teal-100 text-teal-800';
    if (tagLower.includes('soil')) return 'bg-amber-100 text-amber-800';
    if (tagLower.includes('certification')) return 'bg-indigo-100 text-indigo-800';
    if (tagLower.includes('planning')) return 'bg-purple-100 text-purple-800';
    if (tagLower.includes('technology')) return 'bg-cyan-100 text-cyan-800';
    if (tagLower.includes('analysis')) return 'bg-amber-100 text-amber-800';
    if (tagLower.includes('energy')) return 'bg-orange-100 text-orange-800';
    if (tagLower.includes('inventory')) return 'bg-teal-100 text-teal-800';
    
    // Default color
    return 'bg-gray-100 text-gray-800';
  };
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        getTagColor(tag),
        className
      )}
    >
      {tag}
    </span>
  );
};

export default TagBadge;
