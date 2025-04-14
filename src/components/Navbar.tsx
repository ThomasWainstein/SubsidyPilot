
import { Link, useLocation } from 'react-router-dom';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { ChevronDown, Globe, Home, LayoutDashboard, LogOut, ChevronLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

const Navbar = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  
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
  
  // Check if we're on the homepage
  const isHomePage = location.pathname === '/';

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {!isHomePage && (
              <Link to="/dashboard" className="mr-4 text-gray-500 hover:text-gray-700">
                <ChevronLeft size={20} />
                <span className="sr-only">{t('common.back')}</span>
              </Link>
            )}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-2">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">AgriTool</span>
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className={`border-transparent text-gray-500 hover:border-agri-green hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname === '/' ? 'border-green-600 text-gray-900' : ''}`}
              >
                <Home size={18} className="mr-2" />
                Home
              </Link>
              <Link
                to="/dashboard"
                className={`border-transparent text-gray-500 hover:border-agri-green hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname.includes('/dashboard') ? 'border-green-600 text-gray-900' : ''}`}
              >
                <LayoutDashboard size={18} className="mr-2" />
                {t('common.dashboard')}
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Plan Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex items-center">
                  {t('common.plan')}: {t('common.consultantPro')}
                  <ChevronDown size={16} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('common.plan')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>{t('common.free')}</DropdownMenuItem>
                <DropdownMenuItem className="bg-gray-100">{t('common.consultantPro')}</DropdownMenuItem>
                <DropdownMenuItem>{t('common.coopEnterprise')}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Language Selector */}
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
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
                  <User size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut size={16} className="mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
