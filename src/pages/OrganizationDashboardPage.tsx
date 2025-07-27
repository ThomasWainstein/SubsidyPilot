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
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Building2, 
  Users, 
  BarChart3, 
  TrendingUp, 
  FileText, 
  AlertTriangle,
  Shield,
  Globe,
  UserCheck,
  Activity,
  Target,
  DollarSign,
  Calendar,
  Download,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrganizationMetrics {
  totalMembers: number;
  activeMembers: number;
  totalApplications: number;
  successRate: number;
  totalFunding: number;
  complianceScore: number;
  membersByRegion: Record<string, number>;
  applicationsByStatus: Record<string, number>;
  recentActivity: Array<{
    memberName: string;
    action: string;
    timestamp: string;
    status: 'success' | 'pending' | 'warning';
  }>;
  topPerformingMembers: Array<{
    name: string;
    applications: number;
    successRate: number;
    totalFunding: number;
  }>;
  complianceIssues: Array<{
    memberName: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    dueDate: string;
  }>;
}

const OrganizationDashboardPage = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<OrganizationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrganizationMetrics = async () => {
    try {
      // In a real implementation, this would fetch organization data
      // For now, using mock data that represents typical organization metrics
      
      // Mock comprehensive organization metrics
      const mockMetrics: OrganizationMetrics = {
        totalMembers: 247,
        activeMembers: 198,
        totalApplications: 156,
        successRate: 73.2,
        totalFunding: 2450000, // €2.45M
        complianceScore: 87.5,
        membersByRegion: {
          'Provence-Alpes-Côte d\'Azur': 89,
          'Occitanie': 67,
          'Nouvelle-Aquitaine': 45,
          'Auvergne-Rhône-Alpes': 32,
          'Languedoc-Roussillon': 14
        },
        applicationsByStatus: {
          'Approved': 114,
          'In Review': 23,
          'Draft': 12,
          'Rejected': 7
        },
        recentActivity: [
          {
            memberName: 'Coopérative Agricole Sud',
            action: 'Large grant application submitted',
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            status: 'success'
          },
          {
            memberName: 'Ferme Bio Excellence',
            action: 'Compliance documentation required',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            status: 'warning'
          },
          {
            memberName: 'Élevage Moderne SARL',
            action: 'Subsidy match found',
            timestamp: new Date(Date.now() - 5400000).toISOString(),
            status: 'pending'
          }
        ],
        topPerformingMembers: [
          {
            name: 'Domaine Viticole Premium',
            applications: 8,
            successRate: 87.5,
            totalFunding: 245000
          },
          {
            name: 'Coopérative Céréalière',
            applications: 6,
            successRate: 83.3,
            totalFunding: 198000
          },
          {
            name: 'Ferme Innovante Tech',
            applications: 5,
            successRate: 80.0,
            totalFunding: 167000
          }
        ],
        complianceIssues: [
          {
            memberName: 'Ferme Traditionnelle',
            issue: 'Environmental impact report overdue',
            severity: 'high',
            dueDate: '2024-02-05'
          },
          {
            memberName: 'Élevage Central',
            issue: 'Financial audit documentation missing',
            severity: 'medium',
            dueDate: '2024-02-12'
          }
        ]
      };

      setMetrics(mockMetrics);

    } catch (error) {
      console.error('Error fetching organization metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch organization dashboard data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizationMetrics();
  }, []);

  const MetricCard = ({ title, value, change, icon: Icon, color = 'blue', subtitle }: {
    title: string;
    value: string | number;
    change?: string;
    subtitle?: string;
    icon: any;
    color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  }) => {
    const colorClasses = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      orange: 'text-orange-600',
      purple: 'text-purple-600',
      red: 'text-red-600'
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${colorClasses[color]}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
          {change && (
            <p className="text-xs text-green-600 mt-1">
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
              <Building2 className="w-8 h-8 animate-pulse mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading organization dashboard...</p>
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
                Organization Dashboard
              </h1>
              <p className="text-muted-foreground">
                Monitor organizational performance and member compliance
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Manage Settings
              </Button>
            </div>
          </div>
          <Badge variant="secondary" className="mt-2">
            <Building2 className="w-3 h-3 mr-1" />
            Organization Account
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <MetricCard
            title="Total Members"
            value={metrics?.totalMembers || 0}
            subtitle={`${metrics?.activeMembers || 0} active`}
            icon={Users}
            color="blue"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics?.successRate.toFixed(1) || 0}%`}
            change="+2.3% from last quarter"
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="Total Funding"
            value={`€${((metrics?.totalFunding || 0) / 1000000).toFixed(2)}M`}
            subtitle="Secured this year"
            icon={DollarSign}
            color="purple"
          />
          <MetricCard
            title="Compliance Score"
            value={`${metrics?.complianceScore.toFixed(1) || 0}%`}
            change="Organizational health"
            icon={Shield}
            color={metrics && metrics.complianceScore > 85 ? 'green' : 'orange'}
          />
        </div>

        {/* Compliance Alert */}
        {metrics && metrics.complianceScore < 90 && (
          <div className="mb-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="font-medium text-orange-800">
                      Compliance Attention Required
                    </p>
                    <p className="text-sm text-orange-700">
                      {metrics.complianceIssues.length} member(s) have pending compliance issues that need resolution.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Application Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Status Distribution</CardTitle>
                  <CardDescription>
                    Current status of all member applications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(metrics?.applicationsByStatus || {}).map(([status, count]) => {
                      const percentage = ((count / (metrics?.totalApplications || 1)) * 100);
                      const statusColors = {
                        'Approved': 'bg-green-500',
                        'In Review': 'bg-yellow-500',
                        'Draft': 'bg-blue-500',
                        'Rejected': 'bg-red-500'
                      };
                      
                      return (
                        <div key={status} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{status}</span>
                            <span>{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className={`h-2 ${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Members */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Members</CardTitle>
                  <CardDescription>
                    Members with highest success rates and funding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics?.topPerformingMembers.map((member, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{member.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {member.applications} applications • {member.successRate}% success
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">
                            €{(member.totalFunding / 1000).toFixed(0)}k
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
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
                  Member Distribution by Region
                </CardTitle>
                <CardDescription>
                  Geographic spread of organization members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(metrics?.membersByRegion || {}).map(([region, count]) => {
                    const percentage = ((count / (metrics?.totalMembers || 1)) * 100);
                    
                    return (
                      <div key={region} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium">{region}</p>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                        <Progress value={percentage} className="h-2 mb-1" />
                        <p className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}% of total members
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Management</CardTitle>
                <CardDescription>
                  Comprehensive member oversight and management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Member Management Interface</h3>
                  <p className="text-muted-foreground mb-4">
                    Detailed member management and onboarding tools coming soon
                  </p>
                  <Button variant="outline">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Manage Members
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="applications" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Oversight</CardTitle>
                <CardDescription>
                  Monitor and manage all member applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Application Management</h3>
                  <p className="text-muted-foreground mb-4">
                    Comprehensive application tracking and approval workflows coming soon
                  </p>
                  <Button variant="outline">
                    <Activity className="w-4 h-4 mr-2" />
                    View All Applications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Compliance Monitoring
                </CardTitle>
                <CardDescription>
                  Track and manage organizational compliance requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metrics?.complianceIssues && metrics.complianceIssues.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Issue</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Due Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.complianceIssues.map((issue, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {issue.memberName}
                          </TableCell>
                          <TableCell>{issue.issue}</TableCell>
                          <TableCell>
                            <Badge variant={
                              issue.severity === 'high' ? 'destructive' :
                              issue.severity === 'medium' ? 'default' : 'secondary'
                            }>
                              {issue.severity}
                            </Badge>
                          </TableCell>
                          <TableCell>{issue.dueDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                    <p className="text-muted-foreground">
                      No compliance issues requiring immediate attention
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>
                  Detailed analytics and insights for organizational performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
                  <p className="text-muted-foreground mb-4">
                    Comprehensive analytics and reporting dashboard coming soon
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

export default OrganizationDashboardPage;