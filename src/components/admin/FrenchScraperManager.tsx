import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, RefreshCw, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScrapingSession {
  sessionId: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: {
    current: number;
    total: number;
    processed: number;
  };
  results: any[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export function FrenchScraperManager() {
  const [session, setSession] = useState<ScrapingSession>({
    sessionId: '',
    status: 'idle',
    progress: { current: 0, total: 0, processed: 0 },
    results: []
  });

  const [config, setConfig] = useState({
    agency: 'franceagrimer' as 'franceagrimer' | 'lesaides',
    maxPages: 20,
    dryRun: false,
    targetUrls: `https://www.franceagrimer.fr/aides-et-soutiens
https://www.franceagrimer.fr/rechercher-une-aide`
  });

  const agencyConfigs = {
    franceagrimer: {
      name: 'FranceAgriMer',
      functionName: 'franceagrimer-scraper',
      defaultUrls: `https://www.franceagrimer.fr/aides-et-soutiens
https://www.franceagrimer.fr/rechercher-une-aide`,
      description: 'Scraper officiel pour les aides FranceAgriMer'
    },
    lesaides: {
      name: 'Les-Aides.fr',
      functionName: 'lesaides-scraper', 
      defaultUrls: `https://les-aides.fr/aides/?page=1`,
      description: 'Scraper pour la base complète des aides françaises'
    }
  };

  const startScraping = async () => {
    const selectedConfig = agencyConfigs[config.agency];
    
    setSession(prev => ({
      ...prev,
      status: 'running',
      startTime: new Date(),
      sessionId: `${config.agency}-${Date.now()}`
    }));

    try {
      const { data, error } = await supabase.functions.invoke(selectedConfig.functionName, {
        body: {
          maxPages: config.maxPages,
          dryRun: config.dryRun,
          agency: config.agency
        }
      });

      if (error) throw error;

      setSession(prev => ({
        ...prev,
        status: 'completed',
        endTime: new Date(),
        results: data.results || [],
        progress: {
          current: data.processed || 0,
          total: data.totalUrls || 0,
          processed: data.processed || 0
        }
      }));

      toast.success(`Scraping terminé: ${data.processed} aides traitées`);

    } catch (error: any) {
      console.error('Scraping error:', error);
      setSession(prev => ({
        ...prev,
        status: 'error',
        endTime: new Date(),
        error: error.message
      }));
      toast.error('Erreur lors du scraping');
    }
  };

  const stopScraping = () => {
    setSession(prev => ({
      ...prev,
      status: 'idle',
      endTime: new Date()
    }));
  };

  const exportResults = () => {
    if (session.results.length === 0) return;

    const blob = new Blob([JSON.stringify(session.results, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.agency}-results-${session.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = () => {
    switch (session.status) {
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src="https://flagcdn.com/w20/fr.png" alt="France" className="w-5 h-4" />
            Scraper Français - {agencyConfigs[config.agency].name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Configuration */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="agency">Agence à scraper</Label>
              <Select 
                value={config.agency} 
                onValueChange={(value: 'franceagrimer' | 'lesaides') => {
                  setConfig(prev => ({ 
                    ...prev, 
                    agency: value,
                    targetUrls: agencyConfigs[value].defaultUrls 
                  }));
                }}
                disabled={session.status === 'running'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une agence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="franceagrimer">
                    <div className="flex flex-col">
                      <span>FranceAgriMer</span>
                      <span className="text-xs text-muted-foreground">Aides officielles agricoles</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lesaides">
                    <div className="flex flex-col">
                      <span>Les-Aides.fr</span>
                      <span className="text-xs text-muted-foreground">Base complète des aides françaises</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxPages">Pages maximales</Label>
                <Input
                  id="maxPages"
                  type="number"
                  value={config.maxPages}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxPages: parseInt(e.target.value) || 20 }))}
                  disabled={session.status === 'running'}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="dryRun"
                  checked={config.dryRun}
                  onChange={(e) => setConfig(prev => ({ ...prev, dryRun: e.target.checked }))}
                  disabled={session.status === 'running'}
                />
                <Label htmlFor="dryRun">Test à sec (sans sauvegarder)</Label>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="targetUrls">URLs cibles</Label>
            <Textarea
              id="targetUrls"
              value={config.targetUrls}
              onChange={(e) => setConfig(prev => ({ ...prev, targetUrls: e.target.value }))}
              disabled={session.status === 'running'}
              rows={3}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {session.status === 'running' ? (
              <Button onClick={stopScraping} variant="destructive" className="flex items-center gap-2">
                <Square className="w-4 h-4" />
                Arrêter
              </Button>
            ) : (
              <Button onClick={startScraping} className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                Démarrer le scraping
              </Button>
            )}

            {session.results.length > 0 && (
              <Button onClick={exportResults} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Exporter les résultats
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Statut de la session</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Badge className={getStatusColor()}>
              {session.status === 'running' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
              {session.status.toUpperCase()}
            </Badge>
            {session.sessionId && (
              <span className="text-sm text-muted-foreground">ID: {session.sessionId}</span>
            )}
          </div>

          {session.status === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression</span>
                <span>{session.progress.current} / {session.progress.total}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: session.progress.total > 0 
                      ? `${(session.progress.current / session.progress.total) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          )}

          {session.error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Erreur</p>
                <p className="text-sm text-red-600">{session.error}</p>
              </div>
            </div>
          )}

          {session.startTime && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Début:</span>
                <p className="text-muted-foreground">{session.startTime.toLocaleString('fr-FR')}</p>
              </div>
              {session.endTime && (
                <div>
                  <span className="font-medium">Fin:</span>
                  <p className="text-muted-foreground">{session.endTime.toLocaleString('fr-FR')}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Preview */}
      {session.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résultats ({session.results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {session.results.slice(0, 10).map((result, index) => (
                <div key={index} className="p-3 border border-gray-200 rounded-lg">
                  <h4 className="font-medium text-sm">{result.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {result.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {result.amount_eur && (
                      <Badge variant="secondary" className="text-xs">
                        {Array.isArray(result.amount_eur) 
                          ? `${result.amount_eur[0]}-${result.amount_eur[1]} €`
                          : `${result.amount_eur} €`
                        }
                      </Badge>
                    )}
                    {result.agency && (
                      <Badge variant="outline" className="text-xs">
                        {result.agency}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {session.results.length > 10 && (
                <p className="text-center text-sm text-muted-foreground">
                  ... et {session.results.length - 10} autres résultats
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}