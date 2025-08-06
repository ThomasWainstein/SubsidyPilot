import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { 
  Settings, 
  Globe, 
  Target, 
  Filter, 
  Clock, 
  AlertTriangle,
  Plus,
  Trash2,
  TestTube,
  Save,
  RotateCcw
} from 'lucide-react';

interface ScrapingConfig {
  maxPages: number;
  rateLimitMs: number;
  retryAttempts: number;
  timeoutSeconds: number;
  qualityThreshold: number;
  contentTypes: string[];
  targetRegions: string[];
  sectors: string[];
  customUrls: string[];
  blacklistUrls: string[];
  minAmount: number;
  maxAmount: number;
  deadlineRange: { start: string; end: string };
  includeKeywords: string[];
  excludeKeywords: string[];
}

const defaultConfig: ScrapingConfig = {
  maxPages: 50,
  rateLimitMs: 2000,
  retryAttempts: 3,
  timeoutSeconds: 30,
  qualityThreshold: 0.7,
  contentTypes: ['subsidies', 'grants'],
  targetRegions: ['all'],
  sectors: ['agriculture'],
  customUrls: [],
  blacklistUrls: [],
  minAmount: 500,
  maxAmount: 1000000,
  deadlineRange: { start: '', end: '' },
  includeKeywords: [],
  excludeKeywords: []
};

export function AdvancedPipelineConfig() {
  const [frenchConfig, setFrenchConfig] = useState<ScrapingConfig>(defaultConfig);
  const [romanianConfig, setRomanianConfig] = useState<ScrapingConfig>(defaultConfig);
  const [newUrl, setNewUrl] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [activeTab, setActiveTab] = useState('french');

  const currentConfig = activeTab === 'french' ? frenchConfig : romanianConfig;
  const setCurrentConfig = activeTab === 'french' ? setFrenchConfig : setRomanianConfig;

  const updateConfig = (field: keyof ScrapingConfig, value: any) => {
    setCurrentConfig(prev => ({ ...prev, [field]: value }));
  };

  const addUrl = () => {
    if (newUrl && !currentConfig.customUrls.includes(newUrl)) {
      updateConfig('customUrls', [...currentConfig.customUrls, newUrl]);
      setNewUrl('');
    }
  };

  const removeUrl = (url: string) => {
    updateConfig('customUrls', currentConfig.customUrls.filter(u => u !== url));
  };

  const addKeyword = (type: 'include' | 'exclude') => {
    if (newKeyword) {
      const field = type === 'include' ? 'includeKeywords' : 'excludeKeywords';
      const currentList = currentConfig[field];
      if (!currentList.includes(newKeyword)) {
        updateConfig(field, [...currentList, newKeyword]);
        setNewKeyword('');
      }
    }
  };

  const removeKeyword = (keyword: string, type: 'include' | 'exclude') => {
    const field = type === 'include' ? 'includeKeywords' : 'excludeKeywords';
    const currentList = currentConfig[field];
    updateConfig(field, currentList.filter(k => k !== keyword));
  };

  const resetToDefaults = () => {
    setCurrentConfig(defaultConfig);
  };

  const testConfiguration = async () => {
    // Implementation for testing configuration
    console.log('Testing configuration:', currentConfig);
  };

  const saveConfiguration = async () => {
    // Implementation for saving configuration
    console.log('Saving configuration:', { french: frenchConfig, romanian: romanianConfig });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Advanced Pipeline Configuration
          <HelpTooltip content="Configure detailed scraping parameters, filters, and quality controls for each country's pipeline." />
        </CardTitle>
        <CardDescription>
          Fine-tune scraping parameters, set quality thresholds, and configure filters for optimal results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="french" className="flex items-center gap-2">
              🇫🇷 French Settings
            </TabsTrigger>
            <TabsTrigger value="romanian" className="flex items-center gap-2">
              🇷🇴 Romanian Settings
            </TabsTrigger>
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Global Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="french" className="space-y-6 mt-6">
            <ConfigurationForm 
              config={frenchConfig}
              updateConfig={(field, value) => setFrenchConfig(prev => ({ ...prev, [field]: value }))}
              country="France"
            />
          </TabsContent>

          <TabsContent value="romanian" className="space-y-6 mt-6">
            <ConfigurationForm 
              config={romanianConfig}
              updateConfig={(field, value) => setRomanianConfig(prev => ({ ...prev, [field]: value }))}
              country="Romania"
            />
          </TabsContent>

          <TabsContent value="global" className="space-y-6 mt-6">
            <GlobalSettings />
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button onClick={saveConfiguration} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            Save Configuration
          </Button>
          <Button variant="outline" onClick={testConfiguration} className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Test Configuration
          </Button>
          <Button variant="outline" onClick={resetToDefaults} className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigurationForm({ 
  config, 
  updateConfig, 
  country 
}: { 
  config: ScrapingConfig; 
  updateConfig: (field: keyof ScrapingConfig, value: any) => void;
  country: string;
}) {
  return (
    <div className="space-y-6">
      {/* Basic Scraping Parameters */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4" />
          Scraping Parameters
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Max Pages to Scrape
              <HelpTooltip content="Maximum number of pages to scrape in a single session. Higher values take longer but provide more comprehensive coverage." />
            </Label>
            <div className="space-y-3">
              <Slider
                value={[config.maxPages]}
                onValueChange={([value]) => updateConfig('maxPages', value)}
                max={500}
                min={1}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span className="font-medium">{config.maxPages} pages</span>
                <span>500</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Rate Limiting (ms)
              <HelpTooltip content="Delay between requests to avoid overwhelming target servers. Lower values are faster but may cause blocking." />
            </Label>
            <div className="space-y-3">
              <Slider
                value={[config.rateLimitMs]}
                onValueChange={([value]) => updateConfig('rateLimitMs', value)}
                max={10000}
                min={500}
                step={100}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5s</span>
                <span className="font-medium">{config.rateLimitMs / 1000}s</span>
                <span>10s</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Retry Attempts</Label>
            <Select value={config.retryAttempts.toString()} onValueChange={(value) => updateConfig('retryAttempts', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 attempt</SelectItem>
                <SelectItem value="2">2 attempts</SelectItem>
                <SelectItem value="3">3 attempts</SelectItem>
                <SelectItem value="5">5 attempts</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Request Timeout (seconds)</Label>
            <Select value={config.timeoutSeconds.toString()} onValueChange={(value) => updateConfig('timeoutSeconds', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 seconds</SelectItem>
                <SelectItem value="30">30 seconds</SelectItem>
                <SelectItem value="60">60 seconds</SelectItem>
                <SelectItem value="120">2 minutes</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Quality Controls */}
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Quality Controls
        </h4>
        
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Quality Threshold
            <HelpTooltip content="Minimum confidence score required for AI processing. Higher values ensure better quality but may miss some content." />
          </Label>
          <div className="space-y-3">
            <Slider
              value={[config.qualityThreshold]}
              onValueChange={([value]) => updateConfig('qualityThreshold', value)}
              max={1}
              min={0.1}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1 (Low)</span>
              <span className="font-medium">{config.qualityThreshold.toFixed(2)}</span>
              <span>1.0 (High)</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Content Types</Label>
          <div className="flex flex-wrap gap-2">
            {['subsidies', 'grants', 'loans', 'tax_credits', 'insurance'].map((type) => (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={type}
                  checked={config.contentTypes.includes(type)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      updateConfig('contentTypes', [...config.contentTypes, type]);
                    } else {
                      updateConfig('contentTypes', config.contentTypes.filter(t => t !== type));
                    }
                  }}
                />
                <Label htmlFor={type} className="capitalize">{type.replace('_', ' ')}</Label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Amount Filters */}
      <div className="space-y-4">
        <h4 className="font-semibold">Amount Filters</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum Amount (€)</Label>
            <Input
              type="number"
              value={config.minAmount}
              onChange={(e) => updateConfig('minAmount', parseInt(e.target.value) || 0)}
              placeholder="500"
            />
          </div>
          <div className="space-y-2">
            <Label>Maximum Amount (€)</Label>
            <Input
              type="number"
              value={config.maxAmount}
              onChange={(e) => updateConfig('maxAmount', parseInt(e.target.value) || 1000000)}
              placeholder="1000000"
            />
          </div>
        </div>
      </div>

      {/* Custom URLs */}
      <CustomUrlManager
        urls={config.customUrls}
        onAddUrl={(url) => updateConfig('customUrls', [...config.customUrls, url])}
        onRemoveUrl={(url) => updateConfig('customUrls', config.customUrls.filter(u => u !== url))}
      />

      {/* Keywords */}
      <KeywordManager
        includeKeywords={config.includeKeywords}
        excludeKeywords={config.excludeKeywords}
        onAddKeyword={(keyword, type) => {
          const field = type === 'include' ? 'includeKeywords' : 'excludeKeywords';
          const currentList = config[field];
          updateConfig(field, [...currentList, keyword]);
        }}
        onRemoveKeyword={(keyword, type) => {
          const field = type === 'include' ? 'includeKeywords' : 'excludeKeywords';
          const currentList = config[field];
          updateConfig(field, currentList.filter(k => k !== keyword));
        }}
      />
    </div>
  );
}

function CustomUrlManager({ 
  urls, 
  onAddUrl, 
  onRemoveUrl 
}: { 
  urls: string[]; 
  onAddUrl: (url: string) => void; 
  onRemoveUrl: (url: string) => void; 
}) {
  const [newUrl, setNewUrl] = useState('');

  const handleAddUrl = () => {
    if (newUrl && !urls.includes(newUrl)) {
      onAddUrl(newUrl);
      setNewUrl('');
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Custom Target URLs</h4>
      
      <div className="flex gap-2">
        <Input
          placeholder="https://example.com/subsidies"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddUrl()}
        />
        <Button onClick={handleAddUrl} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {urls.length > 0 && (
        <div className="space-y-2">
          {urls.map((url, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="text-sm truncate flex-1">{url}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveUrl(url)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KeywordManager({
  includeKeywords,
  excludeKeywords,
  onAddKeyword,
  onRemoveKeyword
}: {
  includeKeywords: string[];
  excludeKeywords: string[];
  onAddKeyword: (keyword: string, type: 'include' | 'exclude') => void;
  onRemoveKeyword: (keyword: string, type: 'include' | 'exclude') => void;
}) {
  const [newKeyword, setNewKeyword] = useState('');
  const [keywordType, setKeywordType] = useState<'include' | 'exclude'>('include');

  const handleAddKeyword = () => {
    if (newKeyword) {
      onAddKeyword(newKeyword, keywordType);
      setNewKeyword('');
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Keyword Filters</h4>
      
      <div className="flex gap-2">
        <Input
          placeholder="Enter keyword"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
        />
        <Select value={keywordType} onValueChange={(value: 'include' | 'exclude') => setKeywordType(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="include">Include</SelectItem>
            <SelectItem value="exclude">Exclude</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAddKeyword} size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-green-600">Include Keywords</Label>
          <div className="flex flex-wrap gap-1 mt-2">
            {includeKeywords.map((keyword, index) => (
              <Badge key={index} variant="default" className="bg-green-100 text-green-800">
                {keyword}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveKeyword(keyword, 'include')}
                  className="ml-1 h-auto p-0 hover:bg-transparent"
                >
                  ×
                </Button>
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-red-600">Exclude Keywords</Label>
          <div className="flex flex-wrap gap-1 mt-2">
            {excludeKeywords.map((keyword, index) => (
              <Badge key={index} variant="destructive" className="bg-red-100 text-red-800">
                {keyword}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveKeyword(keyword, 'exclude')}
                  className="ml-1 h-auto p-0 hover:bg-transparent"
                >
                  ×
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GlobalSettings() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Global Pipeline Settings
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Language</Label>
            <Select defaultValue="auto">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="ro">Romanian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Currency Conversion</Label>
            <Select defaultValue="auto">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto EUR conversion</SelectItem>
                <SelectItem value="manual">Manual rates</SelectItem>
                <SelectItem value="none">No conversion</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="notifications" />
          <Label htmlFor="notifications">Enable email notifications for pipeline completion</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="auto-cleanup" />
          <Label htmlFor="auto-cleanup">Auto-cleanup failed processing attempts</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="duplicate-detection" />
          <Label htmlFor="duplicate-detection">Enable duplicate subsidy detection</Label>
        </div>
      </div>
    </div>
  );
}