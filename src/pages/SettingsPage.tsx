import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRole } from '@/contexts/RoleContext';
import { getIsAdmin } from '@/config/environment';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Shield, 
  BarChart3, 
  Users, 
  Building2, 
  User,
  Languages,
  Bell,
  Palette,
  Database
} from 'lucide-react';
import AccessControl from '@/components/security/AccessControl';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { currentRole } = useRole();
  const isAdmin = getIsAdmin(user);

  const personalSettings = [
    {
      title: 'Account Settings',
      description: 'Manage your account information and preferences',
      icon: User,
      action: () => navigate('/dashboard'),
      disabled: false
    },
    {
      title: 'Language & Region',
      description: 'Set your preferred language and regional settings',
      icon: Languages,
      action: () => {}, // Could open language settings modal
      disabled: false
    },
    {
      title: 'Notifications',
      description: 'Configure email and system notifications',
      icon: Bell,
      action: () => {}, // Could open notifications settings
      disabled: false
    },
    {
      title: 'Theme',
      description: 'Customize the appearance of your interface',
      icon: Palette,
      action: () => {}, // Could open theme settings
      disabled: false
    }
  ];

  const advancedDashboards = [
    {
      title: 'Consultant Dashboard',
      description: 'Manage multiple client farms and track application progress',
      icon: Users,
      action: () => navigate('/consultant-dashboard'),
      badge: 'Consultant',
      disabled: currentRole !== 'consultant' && currentRole !== 'admin',
      roleRequired: 'consultant'
    },
    {
      title: 'Organization Dashboard',
      description: 'Enterprise-level analytics and member management',
      icon: Building2,
      action: () => navigate('/organization-dashboard'),
      badge: 'Enterprise',
      disabled: currentRole !== 'organization' && currentRole !== 'admin',
      roleRequired: 'organization'
    }
  ];

  const adminFeatures = [
    {
      title: 'Employee Dashboard',
      description: 'Monitor system health, data quality, and error management',
      icon: BarChart3,
      action: () => navigate('/employee-dashboard'),
      badge: 'Admin Only',
      disabled: currentRole !== 'admin'
    },
    {
      title: 'Data Quality Center',
      description: 'Advanced data quality monitoring and batch operations',
      icon: Database,
      action: () => navigate('/data-quality'),
      badge: 'Admin Only',
      disabled: currentRole !== 'admin'
    },
    {
      title: 'Admin Panel',
      description: 'Full system administration and user management',
      icon: Shield,
      action: () => navigate('/admin'),
      badge: 'Admin Only',
      disabled: currentRole !== 'admin'
    },
    {
      title: 'Developer Tools',
      description: 'Access development and testing tools',
      icon: Settings,
      action: () => navigate('/admin'),
      badge: 'Dev Tools',
      disabled: currentRole !== 'admin'
    }
  ];

  const SettingsCard = ({ item, showBadge = false }: { item: any, showBadge?: boolean }) => (
    <Card className={`cursor-pointer hover:shadow-md transition-shadow ${item.disabled ? 'opacity-60' : ''}`} 
          onClick={item.disabled ? undefined : item.action}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <item.icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">{item.title}</CardTitle>
            <CardDescription className="text-sm">{item.description}</CardDescription>
          </div>
        </div>
        {showBadge && item.badge && (
          <Badge variant={item.disabled ? "secondary" : "default"}>
            {item.badge}
          </Badge>
        )}
      </CardHeader>
      {item.disabled && (
        <CardContent className="pt-0">
          <Badge variant="outline" className="text-xs">
            {item.roleRequired ? `Requires ${item.roleRequired} role` : 'Coming Soon'}
          </Badge>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and access advanced dashboards
          </p>
        </div>

        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal Settings</TabsTrigger>
            <TabsTrigger value="dashboards">Advanced Dashboards</TabsTrigger>
            <TabsTrigger value="admin" disabled={currentRole !== 'admin'}>
              Admin Features
              {currentRole === 'admin' && <Shield className="w-4 h-4 ml-2" />}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-6">
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold mb-4">Personal Settings</h2>
              {personalSettings.map((item, index) => (
                <SettingsCard key={index} item={item} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="dashboards" className="mt-6">
            <div className="grid gap-4">
              <h2 className="text-xl font-semibold mb-4">Advanced Dashboards</h2>
              <p className="text-muted-foreground mb-4">
                Access specialized dashboards based on your role and permissions
              </p>
              {advancedDashboards.map((item, index) => (
                <SettingsCard key={index} item={item} showBadge />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="admin" className="mt-6">
            {currentRole !== 'admin' ? (
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Admin Role Required</h3>
                    <p className="text-muted-foreground">
                      Switch to Admin role using the role switcher to access these features.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                <h2 className="text-xl font-semibold mb-4">Admin Features</h2>
                <p className="text-muted-foreground mb-4">
                  Administrative tools for system management and monitoring
                </p>
                {adminFeatures.map((item, index) => (
                  <SettingsCard key={index} item={item} showBadge />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;