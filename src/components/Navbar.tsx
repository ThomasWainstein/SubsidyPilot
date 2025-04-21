
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { ChevronDown, Globe, Home, LayoutDashboard, LogOut, ChevronLeft, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Navbar = () => {
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  
  const languageNames: Record<Language, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    ro: 'Română',
    pl: 'Polski',
  };

  const languageFlags: Record<Language, string> = {
    en: '🇬🇧',
    fr: '🇫🇷',
    es: '🇪🇸',
    ro: '🇷🇴',
    pl: '🇵🇱',
  };
  
  const isHomePage = location.pathname === '/';
  
  const handleBack = () => {
    if (location.pathname.includes('/farm/')) {
      navigate('/dashboard');
    } else if (location.pathname.includes('/eu-subsidy-portal')) {
      navigate('/dashboard');
    } else {
      navigate(-1);
    }
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {!isHomePage && (
              <button 
                onClick={handleBack}
                className="mr-4 text-gray-500 hover:text-gray-700 flex items-center"
                aria-label={t('common.back')}
              >
                <ChevronLeft size={20} />
                <span className="sr-only sm:not-sr-only sm:ml-1">{t('common.back')}</span>
              </button>
            )}
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center mr-2">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">AgriTool</span>
              </Link>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold uppercase">
                      {t('common.demoLabel')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This version is for demonstration only</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className={`border-transparent text-gray-500 hover:border-green-600 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname === '/' ? 'border-green-600 text-gray-900' : ''}`}
              >
                <Home size={18} className="mr-2" />
                {t('nav.home')}
              </Link>
              <Link
                to="/dashboard"
                className={`border-transparent text-gray-500 hover:border-green-600 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${location.pathname.includes('/dashboard') ? 'border-green-600 text-gray-900' : ''}`}
              >
                <LayoutDashboard size={18} className="mr-2" />
                {t('common.dashboard')}
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center" 
              onClick={() => navigate('/subsidy-search')}
            >
              <Search size={16} className="mr-1" />
              {t('common.searchSubsidies')}
            </Button>
            
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
                <DropdownMenuItem onClick={() => setLanguage('pl')}>
                  <span className="mr-2">🇵🇱</span> Polski
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
                  <User size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>{t('nav.profile')}</DropdownMenuItem>
                <DropdownMenuItem>{t('nav.settings')}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut size={16} className="mr-2" />
                  {t('nav.logout')}
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
