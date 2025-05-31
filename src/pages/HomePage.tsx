
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import AuthScreen from '@/components/auth/AuthScreen';

const HomePage = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <AuthScreen />
      
      <footer className="bg-gray-50 py-8 border-t border-gray-200">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          &copy; 2025 AgriTool. {t('footer.allRightsReserved')}
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
