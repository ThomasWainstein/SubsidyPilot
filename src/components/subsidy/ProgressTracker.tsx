/**
 * User Progress Tracking Dashboard
 * Comprehensive progress monitoring and actionable guidance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  FileText, 
  Target,
  Calendar,
  Award,
  ChevronRight,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ProgressTrackerProps {
  farmId: string;
  className?: string;
}

interface ProfileCompleteness {
  score: number;
  missing: string[];
  suggestions: string[];
}

interface ApplicationProgress {
  total: number;
  draft: number;
  submitted: number;
  underReview: number;
  approved: number;
  rejected: number;
}

interface UpcomingDeadline {
  subsidyId: string;
  subsidyTitle: string;
  deadline: Date;
  daysLeft: number;
  status: 'urgent' | 'soon' | 'normal';
}

interface FundingSecured {
  totalApproved: number;
  totalPending: number;
  recentApprovals: Array<{
    subsidyTitle: string;
    amount: number;
    approvedAt: Date;
  }>;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ 
  farmId,
  className = ""
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness>({
    score: 0,
    missing: [],
    suggestions: []
  });
  const [applicationProgress, setApplicationProgress] = useState<ApplicationProgress>({
    total: 0,
    draft: 0,
    submitted: 0,
    underReview: 0,
    approved: 0,
    rejected: 0
  });
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([]);
  const [fundingSecured, setFundingSecured] = useState<FundingSecured>({
    totalApproved: 0,
    totalPending: 0,
    recentApprovals: []
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadProgressData();
  }, [farmId]);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all progress data in parallel
      await Promise.all([
        loadProfileCompleteness(),
        loadApplicationProgress(),
        loadUpcomingDeadlines(),
        loadFundingSecured()
      ]);
    } catch (err) {
      console.error('Error loading progress data:', err);
      setError('Erreur lors du chargement des données de progression');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileCompleteness = async () => {
    const { data: farm, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

    if (error) throw error;

    const missing: string[] = [];
    const suggestions: string[] = [];
    let completedFields = 0;
    const totalFields = 15; // Total important fields

    // Check essential fields
    if (!farm.name) missing.push('Nom de l\'exploitation');
    else completedFields++;

    if (!farm.address) missing.push('Adresse complète');
    else completedFields++;

    if (!farm.total_hectares) missing.push('Surface totale');
    else completedFields++;

    if (!farm.land_use_types || farm.land_use_types.length === 0) {
      missing.push('Types de cultures');
    } else {
      completedFields++;
    }

    if (!farm.legal_status) missing.push('Statut juridique');
    else completedFields++;

    if (!farm.cnp_or_cui) missing.push('CNP/CUI');
    else completedFields++;

    if (!farm.department) missing.push('Département');
    else completedFields++;

    if (!farm.phone) missing.push('Numéro de téléphone');
    else completedFields++;

    if (farm.livestock_present === null) {
      missing.push('Présence d\'élevage');
    } else {
      completedFields++;
    }

    if (!farm.revenue) missing.push('Chiffre d\'affaires');
    else completedFields++;

    if (!farm.certifications || farm.certifications.length === 0) {
      suggestions.push('Ajouter vos certifications (Bio, HVE, etc.) pour débloquer plus de subventions');
    } else {
      completedFields++;
    }

    if (!farm.irrigation_method) {
      suggestions.push('Préciser votre méthode d\'irrigation pour les aides environnementales');
    } else {
      completedFields++;
    }

    if (!farm.software_used || farm.software_used.length === 0) {
      suggestions.push('Indiquer vos logiciels agricoles pour les aides à la digitalisation');
    } else {
      completedFields++;
    }

    if (farm.staff_count === null || farm.staff_count === 0) {
      suggestions.push('Préciser le nombre d\'employés pour les aides à l\'emploi');
    } else {
      completedFields++;
    }

    if (!farm.gdpr_consent || !farm.notify_consent) {
      missing.push('Consentements RGPD manquants');
    } else {
      completedFields++;
    }

    const score = Math.round((completedFields / totalFields) * 100);

    setProfileCompleteness({
      score,
      missing,
      suggestions
    });
  };

  const loadApplicationProgress = async () => {
    // For now, simulate data since applications table might not have data
    // In production, this would query the applications table
    const { data: applications, error } = await supabase
      .from('applications')
      .select('status')
      .eq('farm_id', farmId);

    if (error && error.code !== 'PGRST116') { // Ignore "no rows" error
      console.warn('Applications table query error:', error);
    }

    const progress: ApplicationProgress = {
      total: applications?.length || 0,
      draft: 0,
      submitted: 0,
      underReview: 0,
      approved: 0,
      rejected: 0
    };

    if (applications) {
      applications.forEach(app => {
        switch (app.status) {
          case 'draft': progress.draft++; break;
          case 'submitted': progress.submitted++; break;
          case 'under_review': progress.underReview++; break;
          case 'approved': progress.approved++; break;
          case 'rejected': progress.rejected++; break;
        }
      });
    }

    setApplicationProgress(progress);
  };

  const loadUpcomingDeadlines = async () => {
    // Get subsidies with upcoming deadlines
    const { data: subsidies, error } = await supabase
      .from('subsidies')
      .select('id, title, deadline')
      .not('deadline', 'is', null)
      .gte('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(10);

    if (error) {
      console.warn('Deadlines query error:', error);
      return;
    }

    const deadlines: UpcomingDeadline[] = subsidies?.map(subsidy => {
      const deadline = new Date(subsidy.deadline);
      const today = new Date();
      const daysLeft = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'urgent' | 'soon' | 'normal' = 'normal';
      if (daysLeft <= 7) status = 'urgent';
      else if (daysLeft <= 30) status = 'soon';

      return {
        subsidyId: subsidy.id,
        subsidyTitle: String(subsidy.title || 'Subvention sans titre'),
        deadline,
        daysLeft,
        status
      };
    }) || [];

    setUpcomingDeadlines(deadlines);
  };

  const loadFundingSecured = async () => {
    // Simulate funding data - in production this would come from applications
    const secured: FundingSecured = {
      totalApproved: 0,
      totalPending: 0,
      recentApprovals: []
    };

    setFundingSecured(secured);
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDeadlineColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'border-red-200 bg-red-50';
      case 'soon': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-blue-200 bg-blue-50';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Suivi de Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            <Target className="h-5 w-5" />
            Suivi de Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Completeness */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Complétude du Profil
          </CardTitle>
          <CardDescription>
            Complétez votre profil pour débloquer plus d'opportunités
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progression</span>
            <span className={`text-sm font-bold ${getProgressColor(profileCompleteness.score)}`}>
              {profileCompleteness.score}%
            </span>
          </div>
          
          <Progress value={profileCompleteness.score} className="w-full" />
          
          {profileCompleteness.missing.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-destructive">
                Informations manquantes:
              </h4>
              <div className="flex flex-wrap gap-2">
                {profileCompleteness.missing.map((field, index) => (
                  <Badge key={index} variant="destructive" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {profileCompleteness.suggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-primary">
                Suggestions d'amélioration:
              </h4>
              <ul className="space-y-1">
                {profileCompleteness.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <TrendingUp className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button 
            size="sm" 
            onClick={() => navigate('/farm/profile')}
            className="w-full"
          >
            Compléter le Profil
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      {/* Application Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Candidatures en Cours
          </CardTitle>
          <CardDescription>
            Suivi de vos demandes de subventions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {applicationProgress.total === 0 ? (
            <div className="text-center py-6">
              <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-3">
                Aucune candidature en cours
              </p>
              <Button 
                size="sm"
                onClick={() => navigate('/subsidies')}
              >
                Découvrir les Subventions
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">
                  {applicationProgress.draft}
                </div>
                <div className="text-xs text-muted-foreground">Brouillons</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {applicationProgress.submitted}
                </div>
                <div className="text-xs text-muted-foreground">Soumises</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {applicationProgress.underReview}
                </div>
                <div className="text-xs text-muted-foreground">En Examen</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {applicationProgress.approved}
                </div>
                <div className="text-xs text-muted-foreground">Approuvées</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {applicationProgress.rejected}
                </div>
                <div className="text-xs text-muted-foreground">Refusées</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Échéances Importantes
          </CardTitle>
          <CardDescription>
            Dates limites approchant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingDeadlines.length === 0 ? (
            <div className="text-center py-6">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucune échéance imminente
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.slice(0, 5).map((deadline) => (
                <div 
                  key={deadline.subsidyId}
                  className={`p-3 rounded-lg border ${getDeadlineColor(deadline.status)} cursor-pointer hover:shadow-sm transition-shadow`}
                  onClick={() => navigate(`/subsidy/${deadline.subsidyId}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium line-clamp-1">
                        {deadline.subsidyTitle}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Date limite: {deadline.deadline.toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={deadline.status === 'urgent' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {deadline.daysLeft} jour{deadline.daysLeft > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressTracker;