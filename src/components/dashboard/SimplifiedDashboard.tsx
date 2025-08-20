import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import ActionFocusedFarmCard from '@/components/dashboard/ActionFocusedFarmCard';
import DashboardRecommendations from '@/components/dashboard/DashboardRecommendations';
import SubsidyErrorBoundary from '@/components/error/SubsidyErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  TrendingUp, 
  AlertTriangle, 
  Euro, 
  Clock,
  Target,
  CheckCircle
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import AddFarmModal from '@/components/dashboard/AddFarmModal';
import { usePortfolioMetrics } from '@/hooks/usePortfolioMetrics';

interface Farm {
  id: string;
  name: string;
  address: string;
  department?: string | null;
  total_hectares?: number | null;
  created_at: string;
  updated_at?: string | null;
  status?: 'Profile Complete' | 'Incomplete' | 'Pending';
  tags?: string[];
  livestock?: any;
  land_use_types?: string[];
}

const SimplifiedDashboard: React.FC = () => {
  const { user } = useAuth();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState(false);

  // Fetch farms
  useEffect(() => {
    const fetchFarms = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;
        setFarms(data || []);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: 'Failed to load farms: ' + error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFarms();
  }, [user]);

  // Use real portfolio metrics from actual subsidy eligibility
  const { data: portfolioMetrics } = usePortfolioMetrics(user?.id || '');

  // Prioritize farms by action urgency
  const prioritizedFarms = useMemo(() => {
    return [...farms].sort((a, b) => {
      // Incomplete profiles first (high priority)
      if (a.status !== 'Profile Complete' && b.status === 'Profile Complete') return -1;
      if (a.status === 'Profile Complete' && b.status !== 'Profile Complete') return 1;
      
      // Then by farm size (larger farms = more opportunities)
      const aSize = a.total_hectares || 0;
      const bSize = b.total_hectares || 0;
      return bSize - aSize;
    });
  }, [farms]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow py-8 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-lg">Loading your farms...</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header - Focus on today's priorities */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              What should you do today?
            </h1>
            <p className="text-muted-foreground text-lg">
              Your next steps to secure funding opportunities
            </p>
          </div>

          {/* Portfolio Overview - Only if there are farms */}
          {portfolioMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ready to Apply</p>
                      <p className="text-2xl font-bold text-green-600">
                        {portfolioMetrics.readyForApplications}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        €{Math.round(portfolioMetrics.totalFundingAvailable / 1000)}K available
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Needs Action</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {portfolioMetrics.incompleteProfiles}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        €{Math.round(portfolioMetrics.totalBlockedValue / 1000)}K blocked
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Urgent Deadlines</p>
                      <p className="text-2xl font-bold text-red-600">
                        {portfolioMetrics.urgentDeadlines}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Within 30 days
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Available</p>
                      <p className="text-2xl font-bold text-blue-600">
                        €{Math.round((portfolioMetrics.totalFundingAvailable + portfolioMetrics.totalBlockedValue) / 1000)}K
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {portfolioMetrics.totalHectares} hectares
                      </p>
                    </div>
                    <Euro className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Content */}
          {farms.length === 0 ? (
            <Card className="p-12 text-center bg-muted/30">
              <div className="max-w-md mx-auto">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ready to unlock funding?</h3>
                <p className="text-muted-foreground mb-6">
                  Add your first farm to discover personalized funding opportunities worth thousands of euros.
                </p>
                <Button onClick={() => setIsAddFarmModalOpen(true)} size="lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Your First Farm
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Recommendations Section - Top Priority */}
              <SubsidyErrorBoundary>
                <DashboardRecommendations farms={farms} />
              </SubsidyErrorBoundary>

              {/* Priority Actions Section */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">
                  Your Farms ({farms.length})
                </h2>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddFarmModalOpen(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Farm
                </Button>
              </div>

              {/* Farm Cards - Prioritized by action urgency */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {prioritizedFarms.map((farm) => (
                  <ActionFocusedFarmCard key={farm.id} farm={farm} />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Farm Modal */}
      <AddFarmModal 
        isOpen={isAddFarmModalOpen}
        onClose={() => setIsAddFarmModalOpen(false)}
      />
    </div>
  );
};

export default SimplifiedDashboard;