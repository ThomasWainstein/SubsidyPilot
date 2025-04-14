
import { Link } from 'react-router-dom';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { ChevronDown, Globe, Home, LayoutDashboard, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const { language, setLanguage, t } = useLanguage();
  
  const languageNames: Record<Language, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    ro: 'Română',
  };

  const languageFlags: Record<Language, string> = {
    en: '🇬🇧',
    fr: '🇫🇷',
    es: '🇪🇸',
    ro: '🇷🇴',
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-agri-green flex items-center justify-center mr-2">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <span className="text-xl font-jakarta font-bold text-gray-900">AgriTool</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-transparent text-gray-500 hover:border-agri-green hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <Home size={18} className="mr-2" />
                Home
              </Link>
              <Link
                to="/dashboard"
                className="border-transparent text-gray-500 hover:border-agri-green hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                <LayoutDashboard size={18} className="mr-2" />
                {t('common.dashboard')}
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center">
                  <Globe size={18} className="mr-2" />
                  <span className="mr-1">{languageFlags[language]}</span>
                  <span className="hidden md:inline">{languageNames[language]}</span>
                  <ChevronDown size={16} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setLanguage('en')}>
                  <span className="mr-2">🇬🇧</span> English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('fr')}>
                  <span className="mr-2">🇫🇷</span> Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('es')}>
                  <span className="mr-2">🇪🇸</span> Español
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('ro')}>
                  <span className="mr-2">🇷🇴</span> Română
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button variant="ghost" size="icon" className="ml-2">
              <LogOut size={18} />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
