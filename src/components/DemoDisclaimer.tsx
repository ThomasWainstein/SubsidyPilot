
import { useLanguage } from '@/contexts/language';

const DemoDisclaimer = () => {
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-0 w-full bg-[#FEF7CD] border-t border-yellow-200 text-yellow-800 text-xs md:text-sm text-center py-2 z-50">
      {t('common.demoDisclaimer')}
    </div>
  );
};

export default DemoDisclaimer;
