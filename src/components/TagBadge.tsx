
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
    
    if (tagLower.includes('organic')) return 'bg-tag-organic';
    if (tagLower.includes('biodiversity')) return 'bg-tag-biodiversity';
    if (tagLower.includes('vineyard')) return 'bg-tag-vineyard';
    if (tagLower.includes('precision')) return 'bg-tag-precision';
    if (tagLower.includes('carbon')) return 'bg-tag-carbon';
    if (tagLower.includes('irrigation')) return 'bg-tag-irrigation';
    if (tagLower.includes('solar')) return 'bg-tag-solar';
    if (tagLower.includes('livestock')) return 'bg-tag-livestock';
    if (tagLower.includes('rotation')) return 'bg-tag-rotation';
    if (tagLower.includes('compost')) return 'bg-tag-composting';
    if (tagLower.includes('sustainability')) return 'bg-tag-sustainability';
    if (tagLower.includes('soil')) return 'bg-tag-soil';
    if (tagLower.includes('certification')) return 'bg-blue-500';
    if (tagLower.includes('planning')) return 'bg-purple-500';
    if (tagLower.includes('technology')) return 'bg-cyan-500';
    if (tagLower.includes('analysis')) return 'bg-yellow-500';
    if (tagLower.includes('energy')) return 'bg-orange-500';
    if (tagLower.includes('inventory')) return 'bg-teal-500';
    
    // Default color
    return 'bg-gray-500';
  };
  
  return (
    <span
      className={cn(
        'tag',
        getTagColor(tag),
        className
      )}
    >
      {tag}
    </span>
  );
};

export default TagBadge;
