import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Database, Users, FileText, BarChart3, Shield, Plus, Search, Filter } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface SubsidyData {
  id: string;
  title: string | null;
  description: string | null;
  agency: string | null;
  amount: number[] | null;
  deadline: string | null;
  url: string | null;
  verbatim_extraction: boolean | null;
  document_count: number | null;
  created_at: string;
}

const AdminDashboardPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch subsidies data
  const { data: subsidies, isLoading: subsidiesLoading, refetch: refetchSubsidies } = useQuery({
    queryKey: ['admin-subsidies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subsidies_structured')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch farms data
  const { data: farms, isLoading: farmsLoading } = useQuery({
    queryKey: ['admin-farms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch system stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [subsidiesCount, farmsCount, documentsCount, pagesCount] = await Promise.all([
        supabase.from('subsidies_structured').select('id', { count: 'exact', head: true }),
        supabase.from('farms').select('id', { count: 'exact', head: true }),
        supabase.from('farm_documents').select('id', { count: 'exact', head: true }),
        supabase.from('raw_scraped_pages').select('id', { count: 'exact', head: true })
      ]);

      return {
        subsidies: subsidiesCount.count || 0,
        farms: farmsCount.count || 0,
        documents: documentsCount.count || 0,
        pages: pagesCount.count || 0
      };
    }
  });

  const filteredSubsidies = subsidies?.filter(subsidy =>
    subsidy.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subsidy.agency?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subsidy.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const deleteSubsidy = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subsidies_structured')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Subsidy deleted successfully');
      refetchSubsidies();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete subsidy');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage subsidies, farms, and system operations
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="subsidies" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Subsidies
          </TabsTrigger>
          <TabsTrigger value="farms" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Farms
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
          <TabsTrigger value="tools" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Tools
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subsidies</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.subsidies || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Structured subsidy records
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Registered Farms</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.farms || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active farm profiles
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Documents</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.documents || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Uploaded farm documents
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scraped Pages</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {statsLoading ? '...' : stats?.pages || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Raw scraped content
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subsidies" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subsidies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Subsidy
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subsidies ({filteredSubsidies.length})</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage all subsidy records in the system
              </p>
            </CardHeader>
            <CardContent>
              {subsidiesLoading ? (
                <div className="text-center py-8">Loading subsidies...</div>
              ) : filteredSubsidies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No subsidies match your search' : 'No subsidies found'}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSubsidies.map((subsidy) => (
                    <div key={subsidy.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{subsidy.title || 'Untitled'}</h4>
                          {subsidy.verbatim_extraction && (
                            <Badge variant="secondary" className="text-xs">Verbatim</Badge>
                          )}
                          {subsidy.document_count > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {subsidy.document_count} docs
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {subsidy.description || 'No description available'}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Agency: {subsidy.agency || 'N/A'}</span>
                          <span>Deadline: {subsidy.deadline || 'N/A'}</span>
                          <span>Created: {new Date(subsidy.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => deleteSubsidy(subsidy.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="farms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Farm Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                View and manage registered farms
              </p>
            </CardHeader>
            <CardContent>
              {farmsLoading ? (
                <div className="text-center py-8">Loading farms...</div>
              ) : (
                <div className="space-y-4">
                  {farms?.slice(0, 10).map((farm: any) => (
                    <div key={farm.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{farm.name}</h4>
                        <p className="text-sm text-muted-foreground">{farm.address}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span>{farm.total_hectares} hectares</span>
                          <span>{farm.country}</span>
                          <span>{farm.legal_status}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">View</Button>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Import, export, and manage system data
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-24 flex-col">
                  <Database className="h-6 w-6 mb-2" />
                  Import Data
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Development Tools</CardTitle>
              <p className="text-sm text-muted-foreground">
                Access development and testing tools
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button 
                  variant="outline" 
                  className="h-24 flex-col"
                  onClick={() => window.open('/test-verbatim', '_blank')}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  Verbatim Extraction Test
                </Button>
                <Button 
                  variant="outline" 
                  className="h-24 flex-col"
                  onClick={() => setSelectedTab('subsidies')}
                >
                  <Settings className="h-6 w-6 mb-2" />
                  System Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardPage;