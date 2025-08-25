import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Star, TrendingUp, Clock, Target, AlertTriangle } from 'lucide-react';
import { RecommendationEngine, RecommendationScore } from '@/lib/recommendation-engine';
import { SubsidyDataManager, UnifiedSubsidyData } from '@/lib/subsidy-data-consistency';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
interface RecommendedSectionProps {
  farmId?: string;
  searchQuery?: string;
  className?: string;
}
const RecommendedSection: React.FC<RecommendedSectionProps> = ({
  farmId,
  searchQuery = '',
  className = ''
}) => {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const loadRecommendations = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        let farmProfile;
        if (farmId) {
          // Get specific farm data
          const {
            data: farmData,
            error: farmError
          } = await supabase.from('farms').select('*').eq('id', farmId).single();
          if (farmError || !farmData) {
            throw new Error('Farm not found');
          }
          farmProfile = {
            id: farmData.id,
            department: farmData.department || 'Unknown',
            region: farmData.apia_region?.[0] || 'Unknown',
            country: farmData.country || 'France',
            landUseTypes: farmData.land_use_types || [],
            totalHectares: farmData.total_hectares || 0,
            certifications: farmData.certifications || []
          };
        } else {
          // Get user's first farm as fallback
          const {
            data: farms,
            error: farmsError
          } = await supabase.from('farms').select('*').eq('user_id', user.id).limit(1);
          if (farmsError || !farms || farms.length === 0) {
            setRecommendations([]);
            setLoading(false);
            return;
          }
          const farm = farms[0];
          farmProfile = {
            id: farm.id,
            department: farm.department || 'Unknown',
            region: farm.apia_region?.[0] || 'Unknown',
            country: farm.country || 'France',
            landUseTypes: farm.land_use_types || [],
            totalHectares: farm.total_hectares || 0,
            certifications: farm.certifications || []
          };
        }
        const allRecommendations = await RecommendationEngine.generateRecommendations(farmProfile);

        // Get top recommendations - prioritize quick wins and high value
        const topRecommendations = [...allRecommendations.quickWins.slice(0, 2), ...allRecommendations.highValue.slice(0, 2), ...allRecommendations.expiringSoon.slice(0, 1)].filter(Boolean);

        // Skip search filtering for now due to async nature
        // Just use the top recommendations directly
        setRecommendations(topRecommendations.slice(0, 5));
      } catch (err: any) {
        console.error('Failed to load recommendations:', err);
        setError('Unable to load recommendations');
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };
    loadRecommendations();
  }, [user, farmId, searchQuery]);
  const handleViewRecommendation = (subsidyId: string) => {
    navigate(`/subsidy/${subsidyId}`);
  };
  const getCategoryIcon = (score: number, reasons: string[]) => {
    if (reasons.some(r => r.includes('quick') || r.includes('easy'))) {
      return <Target className="h-4 w-4 text-green-600" />;
    }
    if (reasons.some(r => r.includes('high value') || r.includes('large'))) {
      return <TrendingUp className="h-4 w-4 text-blue-600" />;
    }
    if (reasons.some(r => r.includes('deadline') || r.includes('expiring'))) {
      return <Clock className="h-4 w-4 text-orange-600" />;
    }
    return <Star className="h-4 w-4 text-primary" />;
  };
  if (loading) {
    return <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recommended for You</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="p-3 border rounded-lg">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <div className="flex gap-2 mb-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-3 w-1/2" />
            </div>)}
        </CardContent>
      </Card>;
  }
  if (error || recommendations.length === 0) {
    return <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recommended for You</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            {error ? <>
                <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </> : <>
                <Target className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? `No personalized recommendations match "${searchQuery}"` : 'No personalized recommendations available'}
                </p>
              </>}
          </div>
        </CardContent>
      </Card>;
  }
  return;
};

// Separate component to handle async subsidy data loading
const RecommendationCard: React.FC<{
  recommendation: RecommendationScore;
  onViewRecommendation: (subsidyId: string) => void;
  getCategoryIcon: (score: number, reasons: string[]) => React.ReactElement;
}> = ({
  recommendation: rec,
  onViewRecommendation,
  getCategoryIcon
}) => {
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
    return <div className="p-3 border rounded-lg">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>;
  }
  return <div className="p-3 border rounded-lg hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onViewRecommendation(rec.subsidyId)}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-medium text-sm leading-tight pr-2">
          {subsidy.title}
        </h4>
        {getCategoryIcon(rec.score, rec.reasons)}
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-xs">
          {subsidy.agency}
        </Badge>
        {rec.estimatedValue && <Badge variant="outline" className="text-xs">
            {rec.estimatedValue}
          </Badge>}
        <Badge variant={rec.score >= 80 ? "default" : "outline"} className="text-xs">
          {rec.score}% match
        </Badge>
      </div>

      {rec.reasons.length > 0 && <p className="text-xs text-muted-foreground">
          {rec.reasons[0]}
        </p>}
    </div>;
};
export default RecommendedSection;