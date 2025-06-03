
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import AuthScreen from '@/components/auth/AuthScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const HomePage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect authenticated users to dashboard
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

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
