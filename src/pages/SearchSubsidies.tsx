import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PipelineTestComponent } from '@/components/admin/PipelineTestComponent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Subsidy {
  id: string;
  title: string;
  agency: string;
  amount: number[] | null;
  deadline: string | null;
  region: string[] | null;
  description: string | null;
  url: string;
  created_at: string;
}

export default function SearchSubsidies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [subsidies, setSubsidies] = useState<Subsidy[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchSubsidies = async (search = '') => {
    setLoading(true);
    try {
      let query = supabase
        .from('subsidies_structured')
        .select('*')
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,agency.ilike.%${search}%`);
      }

      const { data, error, count } = await query.limit(50);
      
      if (error) throw error;
      
      setSubsidies(data || []);
      setTotal(count || 0);
    } catch (error) {
      console.error('Error fetching subsidies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubsidies();
  }, []);

  const handleSearch = () => {
    fetchSubsidies(searchTerm);
  };

  const formatAmount = (amount: number[] | null) => {
    if (!amount || amount.length === 0) return 'Not specified';
    const firstAmount = amount[0];
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(firstAmount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Search Subsidies</h1>
        <p className="text-muted-foreground">Find agricultural subsidies across Europe</p>
      </div>

      <Tabs defaultValue="search" className="w-full">
        <TabsList>
          <TabsTrigger value="search">🔍 Search Results</TabsTrigger>
          <TabsTrigger value="pipeline">🧪 Pipeline Test</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-6">
          {/* Search Bar */}
          <div className="flex gap-4">
            <Input
              placeholder="Search subsidies by title, description, or agency..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          {/* Results Count */}
          <div className="text-sm text-muted-foreground">
            Showing {subsidies.length} of {total} subsidies
          </div>

          {/* Results Grid */}
          <div className="grid gap-6">
            {loading ? (
              <div className="text-center py-8">Loading subsidies...</div>
            ) : subsidies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No subsidies found. Try adjusting your search terms.
              </div>
            ) : (
              subsidies.map((subsidy) => (
                <Card key={subsidy.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg leading-tight mb-2">
                          {subsidy.title}
                        </CardTitle>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{subsidy.agency}</Badge>
                          {subsidy.amount && (
                            <Badge variant="outline">
                              {formatAmount(subsidy.amount)}
                            </Badge>
                          )}
                          {subsidy.deadline && (
                            <Badge variant="outline">
                              Deadline: {formatDate(subsidy.deadline)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <a
                        href={subsidy.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-5 w-5" />
                      </a>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {subsidy.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {subsidy.description}
                      </p>
                    )}
                    {subsidy.region && subsidy.region.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        <span className="text-xs text-muted-foreground mr-1">Regions:</span>
                        {subsidy.region.slice(0, 3).map((region, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {region}
                          </Badge>
                        ))}
                        {subsidy.region.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{subsidy.region.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="pipeline">
          <PipelineTestComponent />
        </TabsContent>
      </Tabs>
    </div>
  );
}