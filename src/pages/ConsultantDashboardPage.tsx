import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Navbar from '@/components/Navbar';
import AccessControl from '@/components/security/AccessControl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Building2, 
  BarChart3, 
  TrendingUp, 
  FileText, 
  AlertTriangle,
  UserCheck,
  Globe,
  Plus,
  Search,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConsultantMetrics {
  totalClients: number;
  activeApplications: number;
  successRate: number;
  totalSubsidiesMatched: number;
  clientsByRegion: Record<string, number>;
  recentActivity: Array<{
    farmName: string;
    action: string;
    timestamp: string;
    status: 'success' | 'pending' | 'warning';
  }>;
  upcomingDeadlines: Array<{
    farmName: string;
    subsidyTitle: string;
    deadline: string;
    daysLeft: number;
  }>;
}

const ConsultantDashboardPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<ConsultantMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConsultantMetrics = async () => {
    try {
      // Fetch farms associated with this consultant (user)
      const { data: farms, error: farmsError } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', user?.id);

      if (farmsError) throw farmsError;

      // Fetch applications for all farms
      const farmIds = farms?.map(farm => farm.id) || [];
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('*, farms(*), subsidies(*)')
        .in('farm_id', farmIds);

      if (appsError) throw appsError;

      // Calculate metrics
      const totalClients = farms?.length || 0;
      const activeApplications = applications?.filter(app => 
        ['draft', 'submitted', 'in_review'].includes(app.status)
      ).length || 0;
      
      const completedApps = applications?.filter(app => 
        ['approved', 'rejected'].includes(app.status)
      ) || [];
      const successRate = completedApps.length > 0 
        ? (completedApps.filter(app => app.status === 'approved').length / completedApps.length) * 100
        : 0;

      // Group clients by region
      const clientsByRegion: Record<string, number> = {};
      farms?.forEach(farm => {
        const region = farm.department || 'Unknown';
        clientsByRegion[region] = (clientsByRegion[region] || 0) + 1;
      });

      // Mock recent activity (would come from audit logs in real implementation)
      const recentActivity = [
        {
          farmName: farms?.[0]?.name || 'Ferme Example',
          action: 'New subsidy match found',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: 'success' as const
        },
        {
          farmName: farms?.[1]?.name || 'Green Fields',
          action: 'Application submitted',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          status: 'pending' as const
        },
        {
          farmName: farms?.[0]?.name || 'Farm Alpha',
          action: 'Document upload required',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          status: 'warning' as const
        }
      ];

      // Mock upcoming deadlines
      const upcomingDeadlines = [
        {
          farmName: farms?.[0]?.name || 'Farm Beta',
          subsidyTitle: 'Agricultural Modernization Grant',
          deadline: '2024-02-15',
          daysLeft: 12
        },
        {
          farmName: farms?.[1]?.name || 'Eco Farm',
          subsidyTitle: 'Organic Certification Support',
          deadline: '2024-02-28',
          daysLeft: 25
        }
      ];

      setMetrics({
        totalClients,
        activeApplications,
        successRate,
        totalSubsidiesMatched: applications?.length || 0,
        clientsByRegion,
        recentActivity,
        upcomingDeadlines
      });

    } catch (error) {
      console.error('Error fetching consultant metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch consultant dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultantMetrics();
  }, [user?.id]);

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue' }: {
    title: string;
    value: string | number;
    change?: string;
    icon: any;
    color?: 'blue' | 'green' | 'orange' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      purple: 'text-purple-600'
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <p className="text-xs text-muted-foreground mt-1">
              {change}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 animate-pulse mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading consultant dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Consultant Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage your client portfolio and track subsidy applications
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          </div>
          <Badge variant="secondary" className="mt-2">
            <UserCheck className="w-3 h-3 mr-1" />
            Consultant Account
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="Total Clients"
            value={metrics?.totalClients || 0}
            change="Active farm portfolios"
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Active Applications"
            value={metrics?.activeApplications || 0}
            change="In progress"
            icon={FileText}
            color="orange"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics?.successRate.toFixed(1) || 0}%`}
            change="Application approval rate"
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="Subsidies Matched"
            value={metrics?.totalSubsidiesMatched || 0}
            change="Total opportunities found"
            icon={Search}
            color="purple"
          />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clients">Client Portfolio</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest updates across your client portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.recentActivity.map((activity, index) => {
                      const statusColors = {
                        success: 'bg-green-100 text-green-800',
                        pending: 'bg-yellow-100 text-yellow-800',
                        warning: 'bg-red-100 text-red-800'
                      };

                      return (
                        <div key={index} className="flex items-center space-x-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {activity.farmName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.action}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge variant="secondary" className={statusColors[activity.status]}>
                              {activity.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground mt-1">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Upcoming Deadlines */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2 text-orange-500" />
                    Upcoming Deadlines
                  </CardTitle>
                  <CardDescription>
                    Applications requiring attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.upcomingDeadlines.map((deadline, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="text-sm font-medium">{deadline.farmName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {deadline.subsidyTitle}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            deadline.daysLeft <= 7 ? 'text-red-600' : 
                            deadline.daysLeft <= 14 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {deadline.daysLeft} days
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {deadline.deadline}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Regional Distribution */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="w-4 h-4 mr-2" />
                  Client Distribution by Region
                </CardTitle>
                <CardDescription>
                  Geographic spread of your client portfolio
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {Object.entries(metrics?.clientsByRegion || {}).map(([region, count]) => (
                    <div key={region} className="text-center p-4 border rounded-lg">
                      <p className="text-2xl font-bold text-primary">{count}</p>
                      <p className="text-sm text-muted-foreground">{region}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Portfolio Management</CardTitle>
                <CardDescription>
                  Manage and monitor all your client farms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Client Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Detailed client management interface coming soon
                  </p>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Client
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Management</CardTitle>
                <CardDescription>
                  Track and manage subsidy applications across all clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Application Tracking</h3>
                  <p className="text-muted-foreground mb-4">
                    Comprehensive application management interface coming soon
                  </p>
                  <Button variant="outline">
                    <Search className="w-4 h-4 mr-2" />
                    View All Applications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed analytics and reporting for your consultancy
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Comprehensive analytics dashboard coming soon
                  </p>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Analytics Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ConsultantDashboardPage;