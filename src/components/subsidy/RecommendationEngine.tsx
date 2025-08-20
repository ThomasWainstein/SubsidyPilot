/**
 * Intelligent Subsidy Recommendations Component
 * Displays personalized subsidy recommendations based on farm profile
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, Clock, Sparkles, Users, ChevronRight, Star, AlertCircle } from 'lucide-react';
import { RecommendationEngine, type RecommendationScore } from '@/lib/recommendation-engine';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface RecommendationEngineProps {
  farmId: string;
  className?: string;
}

interface RecommendationCategories {
  quickWins: RecommendationScore[];
  highValue: RecommendationScore[];
  expiringSoon: RecommendationScore[];
  newOpportunities: RecommendationScore[];
  popular: RecommendationScore[];
}

const RecommendationEngineComponent: React.FC<RecommendationEngineProps> = ({ 
  farmId,
  className = ""
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationCategories>({
    quickWins: [],
    highValue: [],
    expiringSoon: [],
    newOpportunities: [],
    popular: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [farmProfile, setFarmProfile] = useState<any>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch farm profile
        const { data: farm, error: farmError } = await supabase
          .from('farms')
          .select('*')
          .eq('id', farmId)
          .single();

        if (farmError) throw farmError;
        setFarmProfile(farm);

        // Generate recommendations
        const recs = await RecommendationEngine.generateRecommendations(farm);
        setRecommendations(recs);
      } catch (err) {
        console.error('Error loading recommendations:', err);
        setError('Erreur lors du chargement des recommandations');
      } finally {
        setLoading(false);
      }
    };

    if (farmId) {
      loadRecommendations();
    }
  }, [farmId]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quickWins': return <Zap className="h-4 w-4" />;
      case 'highValue': return <TrendingUp className="h-4 w-4" />;
      case 'expiringSoon': return <Clock className="h-4 w-4" />;
      case 'newOpportunities': return <Sparkles className="h-4 w-4" />;
      case 'popular': return <Users className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'quickWins': return 'Victoires Rapides';
      case 'highValue': return 'Forte Valeur';
      case 'expiringSoon': return 'Urgent';
      case 'newOpportunities': return 'Nouvelles Opportunités';
      case 'popular': return 'Populaires';
      default: return 'Recommandations';
    }
  };

  const getCategoryDescription = (category: string) => {
    switch (category) {
      case 'quickWins': return 'Applications simples avec peu de prérequis';
      case 'highValue': return 'Montants élevés pour votre exploitation';
      case 'expiringSoon': return 'Dates limites approchant';
      case 'newOpportunities': return 'Récemment ajoutées à la base';
      case 'popular': return 'Les plus demandées par les agriculteurs';
      default: return 'Recommandations personnalisées';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-orange-600 bg-orange-50 border-orange-200';
  };

  const RecommendationCard: React.FC<{ rec: RecommendationScore }> = ({ rec }) => {
    const [subsidyDetails, setSubsidyDetails] = useState<any>(null);

    useEffect(() => {
      const fetchSubsidyDetails = async () => {
        const { data } = await supabase
          .from('subsidies')
          .select('*')
          .eq('id', rec.subsidyId)
          .single();
        setSubsidyDetails(data);
      };

      fetchSubsidyDetails();
    }, [rec.subsidyId]);

    if (!subsidyDetails) return null;

    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-base line-clamp-2 mb-2">
                {subsidyDetails.title}
              </CardTitle>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`px-2 py-1 text-xs border ${getScoreColor(rec.score)}`}>
                  Score: {rec.score}%
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {subsidyDetails.agency || 'Organisation'}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/subsidy/${rec.subsidyId}`)}
              className="ml-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Confidence Score */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Pertinence</span>
              <span>{Math.round(rec.confidence * 100)}%</span>
            </div>
            <Progress value={rec.confidence * 100} className="h-1" />
          </div>

          {/* Estimated Value */}
          {rec.estimatedValue && (
            <div className="mb-3 p-2 bg-primary/5 rounded text-xs">
              <div className="flex items-center gap-1 text-primary">
                <TrendingUp className="h-3 w-3" />
                {rec.estimatedValue}
              </div>
            </div>
          )}

          {/* Reasons */}
          {rec.reasons.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                Pourquoi recommandé:
              </h4>
              <ul className="text-xs space-y-1">
                {rec.reasons.slice(0, 2).map((reason, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <Star className="h-3 w-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Blockers */}
          {rec.blockers && rec.blockers.length > 0 && (
            <div className="mb-3">
              <h4 className="text-xs font-medium text-destructive mb-1">
                Points d'attention:
              </h4>
              <ul className="text-xs space-y-1">
                {rec.blockers.slice(0, 2).map((blocker, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 text-destructive mt-0.5 flex-shrink-0" />
                    <span className="text-destructive line-clamp-2">{blocker}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Steps */}
          {rec.nextSteps && rec.nextSteps.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-1">
                Prochaines étapes:
              </h4>
              <ul className="text-xs space-y-1">
                {rec.nextSteps.slice(0, 2).map((step, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <ChevronRight className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recommandations Personnalisées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">
                Analyse de votre profil en cours...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recommandations Personnalisées
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalRecommendations = Object.values(recommendations).reduce((sum, recs) => sum + recs.length, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Recommandations Personnalisées
        </CardTitle>
        <CardDescription>
          {totalRecommendations} opportunités identifiées pour votre exploitation
          {farmProfile && (
            <span className="ml-2 text-xs">
              • {farmProfile.department || farmProfile.region || 'France'}
              {farmProfile.totalHectares && ` • ${farmProfile.totalHectares} ha`}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="quickWins" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full">
            {Object.entries(recommendations).map(([category, recs]) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="flex items-center gap-1 text-xs"
              >
                {getCategoryIcon(category)}
                <span className="hidden sm:inline">
                  {getCategoryTitle(category)}
                </span>
                {recs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1">
                    {recs.length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(recommendations).map(([category, recs]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold mb-1">
                  {getCategoryTitle(category)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {getCategoryDescription(category)}
                </p>
              </div>

              {recs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-2">
                    {getCategoryIcon(category)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aucune recommandation dans cette catégorie pour le moment
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {recs.map((rec) => (
                    <RecommendationCard key={rec.subsidyId} rec={rec} />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RecommendationEngineComponent;