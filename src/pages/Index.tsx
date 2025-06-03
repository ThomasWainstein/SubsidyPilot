
import { useLanguage } from "@/contexts/language";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Index = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl sm:text-6xl font-bold text-gray-900 mb-6">
            Welcome to <span className="text-green-600">AgriTool</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Your comprehensive platform for managing agricultural subsidies, farm profiles, and regulatory compliance across Europe.
          </p>
          
          <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center mb-12">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/auth')}
            >
              Get Started
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => navigate('/auth')}
            >
              Login
            </Button>
          </div>
          
          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                📋
              </div>
              <h3 className="text-lg font-semibold mb-2">Digital Farm Profiles</h3>
              <p className="text-gray-600">Create and manage comprehensive farm profiles with all required documentation</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                🎯
              </div>
              <h3 className="text-lg font-semibold mb-2">Subsidy Matching</h3>
              <p className="text-gray-600">AI-powered matching with relevant agricultural subsidies across Europe</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                📊
              </div>
              <h3 className="text-lg font-semibold mb-2">Application Tracking</h3>
              <p className="text-gray-600">Track and manage subsidy applications with automated compliance checking</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Index;
