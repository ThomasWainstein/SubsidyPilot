import React from 'react';
import { BatchParserTrigger } from '@/components/admin/BatchParserTrigger';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, Zap, TrendingUp } from 'lucide-react';

const BatchParserTest: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Enhanced Subsidy Parser</h1>
          <p className="text-muted-foreground">
            Traitement hybride avancé pour une extraction de données révolutionnaire
          </p>
        </div>
      </div>

      {/* Problem Statement */}
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>🎯 Objectif du Traitement Enhanced</AlertTitle>
        <AlertDescription>
          <div className="space-y-2 mt-2">
            <p><strong>Problème actuel:</strong> Extraction "€20 - €20" au lieu de "20% sur investissement €5,000 - €30,000 (aide: €1,000 - €6,000)"</p>
            <p><strong>Solution:</strong> Parser français avancé + IA hybride pour 90%+ de précision</p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Expected Benefits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Bénéfices Attendus du Traitement
          </CardTitle>
          <CardDescription>
            Transformation complète de la qualité d'extraction des 47 subventions existantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600">85-90%</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">Subventions traitées localement</div>
              <div className="text-xs text-muted-foreground mt-1">Sans coût IA</div>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">70-80%</div>
              <div className="text-sm text-green-700 dark:text-green-300">Réduction des coûts IA</div>
              <div className="text-xs text-muted-foreground mt-1">Parser local optimisé</div>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600">90%+</div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Précision d'extraction</div>
              <div className="text-xs text-muted-foreground mt-1">Patterns français avancés</div>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-bold text-orange-600">60-70%</div>
              <div className="text-sm text-orange-700 dark:text-orange-300">Vitesse améliorée</div>
              <div className="text-xs text-muted-foreground mt-1">Processing optimisé</div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              🔥 Cas d'usage spécifique - Subvention TPE Pays de Mormal
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-red-700 dark:text-red-300">❌ Avant (problématique):</div>
                <div className="bg-red-100 dark:bg-red-950/30 p-2 rounded text-red-800 dark:text-red-200 font-mono">
                  €20 - €20
                </div>
              </div>
              <div>
                <div className="font-medium text-green-700 dark:text-green-300">✅ Après (enhanced):</div>
                <div className="bg-green-100 dark:bg-green-950/30 p-2 rounded text-green-800 dark:text-green-200 font-mono">
                  20% sur investissement €5,000 - €30,000<br/>
                  (aide: €1,000 - €6,000)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Details */}
      <Card>
        <CardHeader>
          <CardTitle>🔧 Améliorations Techniques Implémentées</CardTitle>
          <CardDescription>
            Détails des nouvelles capacités du système d'extraction
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Parser Français Avancé</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-4">
                <li>Patterns complexes "pourcentage + plage d'investissement"</li>
                <li>Reconnaissance entités: TPE, PME, micro-entreprises, associations</li>
                <li>Extraction processus candidature et documents requis</li>
                <li>Détection géographique précise (Pays de Mormal, etc.)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2. Système Hybride IA + Local</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-4">
                <li>Seuil de confiance: 60% pour décision local vs IA</li>
                <li>Modèle économique: gpt-4o-mini pour enhancement, gpt-4o pour extraction complète</li>
                <li>Fusion intelligente des résultats local + IA</li>
                <li>Métriques de performance et coûts détaillées</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Optimisations de Performance</h4>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground ml-4">
                <li>Traitement par lots (batch) avec tâches en arrière-plan</li>
                <li>Cache des résultats pour éviter le retraitement</li>
                <li>Priorité patterns: plus spécifiques en premier</li>
                <li>Extraction multi-sources: HTML brut, LesAides.fr, markdown</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Processing Interface */}
      <BatchParserTrigger />

      {/* Technical Notes */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Notes Techniques</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p><strong>Mode Test:</strong> Traite les 5 premières subventions pour validation rapide des améliorations</p>
            <p><strong>Mode Complet:</strong> Traite toutes les 47 subventions avec processing en arrière-plan</p>
            <p><strong>Fallback Sécurisé:</strong> Si IA échoue, utilise toujours le résultat local disponible</p>
            <p><strong>Monitoring:</strong> Logs détaillés et métriques de performance pour chaque subvention</p>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-xs text-muted-foreground font-mono">
              Edge Function: batch-enhanced-parser<br/>
              Hook: useEnhancedSubsidyParser<br/>
              Parser: FrenchSubsidyParser (enhanced)<br/>
              Models: gpt-4o, gpt-4o-mini (cost-optimized)
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BatchParserTest;