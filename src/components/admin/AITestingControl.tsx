import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Loader2, TestTube, Clock, CheckCircle, AlertCircle, Eye } from 'lucide-react';

interface PageInfo {
  id: string;
  source_url: string;
  content_length: number;
  created_at: string;
  status: string;
  run_id?: string;
}

interface AIRunResult {
  success: boolean;
  run_id: string;
  model: string;
  pages_processed: number;
  subsidies_created: number;
  errors_count?: number;
  pages_seen?: number;
  pages_eligible?: number;
}

export function AITestingControl() {
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<AIRunResult | null>(null);
  const [batchSize, setBatchSize] = useState('2');
  const [model, setModel] = useState('gpt-4.1-2025-04-14');
  const [customRunId, setCustomRunId] = useState('');
  const [pageFilter, setPageFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Load available pages
  useEffect(() => {
    loadPages();
  }, [pageFilter]);

  const loadPages = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('raw_scraped_pages')
        .select('id, source_url, created_at, status, run_id')
        .order('created_at', { ascending: false });

      if (pageFilter === 'processed') {
        // Check if page was used in any AI run
        const { data: runPages } = await supabase
          .from('ai_content_runs')
          .select('run_id');
        
        if (runPages?.length) {
          const runIds = runPages.map(r => r.run_id);
          query = query.in('run_id', runIds);
        }
      } else if (pageFilter === 'unprocessed') {
        query = query.is('run_id', null);
      }

      const { data, error } = await query.limit(50);
      
      if (error) throw error;

      const pagesWithLength = await Promise.all(
        (data || []).map(async (page) => {
          const { data: contentData } = await supabase
            .from('raw_scraped_pages')
            .select('raw_text')
            .eq('id', page.id)
            .single();
          
          return {
            ...page,
            content_length: contentData?.raw_text?.length || 0
          };
        })
      );

      setPages(pagesWithLength);
    } catch (error) {
      console.error('Error loading pages:', error);
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const runAITest = async () => {
    if (selectedPages.length === 0) {
      toast.error('Please select at least one page to test');
      return;
    }

    setIsProcessing(true);
    
    try {
      const testRunId = customRunId || crypto.randomUUID();
      
      toast.info(`🧪 Starting AI test on ${selectedPages.length} page(s)...`);
      
      const { data, error } = await supabase.functions.invoke('ai-content-processor-v2', {
        body: {
          run_id: testRunId,
          test_mode: true,
          page_ids: selectedPages,
          model: model,
          batch_size: parseInt(batchSize)
        }
      });

      if (error) {
        console.error('AI test error:', error);
        throw error;
      }
      
      console.log('AI test response:', data);
      setLastResult(data);
      
      if (data?.success) {
        toast.success(`✅ AI test completed! Processed: ${data.pages_processed}, Created: ${data.subsidies_created || 0} subsidies`);
        
        // Reload pages to show updated status
        await loadPages();
        setSelectedPages([]);
      } else {
        toast.error(`❌ AI test failed: ${data?.error || 'Unknown error'}`);
      }
      
    } catch (error: any) {
      console.error('AI test error:', error);
      toast.error(`❌ AI test failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const viewPageContent = async (pageId: string) => {
    try {
      const { data, error } = await supabase
        .from('raw_scraped_pages')
        .select('source_url, raw_text')
        .eq('id', pageId)
        .single();
      
      if (error) throw error;
      
      // Open in a new window with formatted content
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <html>
            <head><title>Page Content - ${data.source_url}</title></head>
            <body style="font-family: monospace; padding: 20px;">
              <h3>URL: ${data.source_url}</h3>
              <hr>
              <pre style="white-space: pre-wrap;">${data.raw_text}</pre>
            </body>
          </html>
        `);
        newWindow.document.close();
      }
    } catch (error) {
      toast.error('Failed to load page content');
    }
  };

  const togglePageSelection = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const selectRandomPages = () => {
    const count = parseInt(batchSize);
    const availablePages = pages.filter(p => p.status === 'completed');
    const shuffled = [...availablePages].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count).map(p => p.id);
    setSelectedPages(selected);
    toast.info(`Selected ${selected.length} random pages`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading pages...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary" />
            AI Testing Control
          </CardTitle>
          <CardDescription>
            Test AI processing on specific pages with granular control and real-time feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="batch-size">Batch Size</Label>
              <Input
                id="batch-size"
                type="number"
                min="1"
                max="10"
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="model">AI Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1 (Recommended)</SelectItem>
                  <SelectItem value="gpt-5-2025-08-07">GPT-5 (Latest)</SelectItem>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini (Fast)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="custom-run-id">Custom Run ID (Optional)</Label>
              <Input
                id="custom-run-id"
                placeholder="Leave empty for auto-generate"
                value={customRunId}
                onChange={(e) => setCustomRunId(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runAITest}
              disabled={isProcessing || selectedPages.length === 0}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing {selectedPages.length} page(s)...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Test AI Processing ({selectedPages.length} selected)
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={selectRandomPages}
              disabled={pages.length === 0}
            >
              Select Random
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Result */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Last Test Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant={lastResult.success ? "default" : "destructive"}>
                  {lastResult.success ? "Success" : "Failed"}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pages Processed</div>
                <div className="font-semibold">{lastResult.pages_processed || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Subsidies Created</div>
                <div className="font-semibold">{lastResult.subsidies_created || 0}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Model</div>
                <div className="font-semibold">{lastResult.model}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Run ID</div>
                <div className="font-mono text-xs">{lastResult.run_id}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Page Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Available Pages ({pages.length})</CardTitle>
          <div className="flex gap-2">
            <Select value={pageFilter} onValueChange={setPageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pages</SelectItem>
                <SelectItem value="unprocessed">Unprocessed Only</SelectItem>
                <SelectItem value="processed">Previously Processed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadPages}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {pages.map((page) => (
              <div 
                key={page.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedPages.includes(page.id) 
                    ? 'bg-primary/10 border-primary' 
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => togglePageSelection(page.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedPages.includes(page.id)}
                  onChange={() => togglePageSelection(page.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{page.source_url}</div>
                  <div className="text-sm text-muted-foreground">
                    {(page.content_length / 1000).toFixed(1)}k chars • {new Date(page.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={page.status === 'completed' ? 'default' : 'secondary'}>
                    {page.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      viewPageContent(page.id);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {pages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pages available for the selected filter
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}