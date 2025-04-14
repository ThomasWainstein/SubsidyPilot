
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const NotFound = () => {
  const location = useLocation();
  const { t } = useLanguage();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center max-w-md px-4">
        <h1 className="text-6xl font-bold text-agri-green mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">
          {t('errors.pageNotFound')}
        </p>
        <Button asChild size="lg">
          <Link to="/">
            {t('common.returnHome')}
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
