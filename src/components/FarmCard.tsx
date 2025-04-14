
import { Farm } from '@/data/farms';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import TagBadge from './TagBadge';
import StatusBadge from './StatusBadge';
import { CalendarDays } from 'lucide-react';

interface FarmCardProps {
  farm: Farm;
}

const FarmCard = ({ farm }: FarmCardProps) => {
  const { t } = useLanguage();

  return (
    <div className="glass-card rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="p-6">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{farm.name}</h3>
          <StatusBadge status={farm.status} />
        </div>
        
        <div className="flex items-center text-sm text-gray-500 mb-4">
          <CalendarDays size={16} className="mr-1" />
          <span>{t('common.lastUpdated')}: {farm.updatedAt}</span>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600">{farm.region}</p>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {farm.tags.map((tag, index) => (
            <TagBadge key={index} tag={tag} />
          ))}
        </div>
        
        <div className="flex justify-end">
          <Button asChild>
            <Link to={`/farm/${farm.id}`}>
              {t('common.viewFarm')}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FarmCard;
