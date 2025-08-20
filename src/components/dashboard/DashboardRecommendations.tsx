import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  ExternalLink,
  Lightbulb,
  ArrowRight,
  AlertTriangle 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RecommendationEngine, RecommendationScore } from '@/lib/recommendation-engine';
import { SubsidyDataManager, UnifiedSubsidyData } from '@/lib/subsidy-data-consistency';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface DashboardRecommendationsProps {
  farms: any[];
  className?: string;
}

const DashboardRecommendations: React.FC<DashboardRecommendationsProps> = ({ 
  farms, 
  className = '' 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user || farms.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get recommendations for the first/primary farm
        const primaryFarm = farms[0];
        const farmProfile = {
          id: primaryFarm.id,
          department: primaryFarm.department || 'Unknown',
          region: primaryFarm.apia_region?.[0] || 'Unknown',
          country: primaryFarm.country || 'France',
          landUseTypes: primaryFarm.land_use_types || [],
          totalHectares: primaryFarm.total_hectares || 0,
          certifications: primaryFarm.certifications || []
        };

        const allRecommendations = await RecommendationEngine.generateRecommendations(farmProfile);
        
        // Get top 3 recommendations across all categories
        const topRecommendations = [
          ...allRecommendations.quickWins.slice(0, 1),
          ...allRecommendations.highValue.slice(0, 1),
          ...allRecommendations.expiringSoon.slice(0, 1)
        ].filter(Boolean).slice(0, 3);

        setRecommendations(topRecommendations);
      } catch (err: any) {
        console.error('Failed to load recommendations:', err);
        setError('Unable to load personalized recommendations');
        
        // Fallback: show generic high-value subsidies
        try {
          const fallback = await SubsidyDataManager.getUnifiedSubsidies();
          const genericRecommendations = fallback
            .filter(sub => sub.amount.max && sub.amount.max > 10000)
            .slice(0, 3)
            .map(sub => ({
              subsidyId: sub.id,
              score: 75,
              reasons: ['High funding amount available'],
              category: 'highValue' as const,
              confidence: 0.6,
              estimatedValue: `€${Math.round((sub.amount.max || 0) / 1000)}K`,
              blockers: ['Verify eligibility requirements'],
              nextSteps: ['Review full eligibility criteria', 'Check application deadlines']
            }));
          
          setRecommendations(genericRecommendations);
        } catch {
          // Complete fallback failure
          setRecommendations([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [user, farms]);

  const handleViewRecommendation = async (subsidyId: string) => {
    navigate(`/subsidy/${subsidyId}`);
  };

  const getSubsidyFromRecommendation = async (rec: RecommendationScore) => {
    try {
      const subsidies = await SubsidyDataManager.getUnifiedSubsidies();
      return subsidies.find(s => s.id === rec.subsidyId);
    } catch {
      return null;
    }
  };

  const handleViewAllRecommendations = () => {
    navigate(`/subsidies/recommendations`);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Personalized Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle>Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button 
              variant="outline" 
              onClick={() => navigate('/subsidies/search')}
            >
              Browse All Subsidies
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (farms.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Personalized Recommendations</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Add a farm to get personalized subsidy recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Recommended for You</CardTitle>
          </div>
          {recommendations.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleViewAllRecommendations}
              className="flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
        {error && (
          <p className="text-sm text-orange-600">
            Showing fallback recommendations due to: {error}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">
              No recommendations available at this time
            </p>
          </div>
        ) : (
          recommendations.map((rec, index) => (
            <RecommendationCard 
              key={rec.subsidyId} 
              recommendation={rec}
              onViewRecommendation={handleViewRecommendation}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

// Separate component to handle async subsidy data loading
const RecommendationCard: React.FC<{
  recommendation: RecommendationScore;
  onViewRecommendation: (subsidyId: string) => void;
}> = ({ recommendation: rec, onViewRecommendation }) => {
  const [subsidy, setSubsidy] = useState<UnifiedSubsidyData | null>(null);

  useEffect(() => {
    const loadSubsidy = async () => {
      try {
        const subsidies = await SubsidyDataManager.getUnifiedSubsidies();
        const found = subsidies.find(s => s.id === rec.subsidyId);
        setSubsidy(found || null);
      } catch (error) {
        console.error('Failed to load subsidy details:', error);
      }
    };

    loadSubsidy();
  }, [rec.subsidyId]);

  if (!subsidy) {
    return (
      <div className="p-4 border rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Loading recommendation...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onViewRecommendation(rec.subsidyId)}
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm leading-tight">
          {subsidy.title}
        </h4>
        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-xs">
          {subsidy.agency}
        </Badge>
        {rec.estimatedValue && (
          <Badge variant="outline" className="text-xs">
            {rec.estimatedValue}
          </Badge>
        )}
        <Badge 
          variant={rec.score >= 80 ? "default" : "outline"} 
          className="text-xs"
        >
          {rec.score}% match
        </Badge>
      </div>

      {rec.reasons.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          <TrendingUp className="h-3 w-3 inline mr-1" />
          {rec.reasons[0]}
        </p>
      )}

      {subsidy.deadline.date && (
        <p className="text-xs text-orange-600">
          <Clock className="h-3 w-3 inline mr-1" />
          Deadline: {subsidy.deadline.date.toLocaleDateString('fr-FR')}
        </p>
      )}
    </div>
  );
};

export default DashboardRecommendations;