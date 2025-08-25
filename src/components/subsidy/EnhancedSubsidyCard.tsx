import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ExternalLink, MapPin, Building2, Calendar, Euro, Clock, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSubsidyTitle, getSubsidyDescription } from '@/utils/subsidyFormatting';
import { getDeadlineStatus } from '@/utils/subsidyFormatting';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEnhancedSubsidyParser } from '@/hooks/useEnhancedSubsidyParser';
import { FrenchSubsidyParser } from '@/lib/extraction/french-subsidy-parser';
import OrganizationLogo from './OrganizationLogo';

interface EnhancedSubsidyCardProps {
  subsidy: any;
  showMatchScore?: boolean;
  onFavorite?: (id: string) => void;
  isFavorited?: boolean;
}

export const EnhancedSubsidyCard: React.FC<EnhancedSubsidyCardProps> = ({
  subsidy,
  showMatchScore = false,
  onFavorite,
  isFavorited = false
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { parsedData, parseSubsidy, isProcessing, getFundingDisplay, getEligibilityDisplay } = useEnhancedSubsidyParser();
  const [localParsedData, setLocalParsedData] = useState(null);
  
  const deadlineStatus = getDeadlineStatus(subsidy.deadline);

  // Try to use enhanced data if available, otherwise use local parsing
  useEffect(() => {
    // Check if we already have enhanced data
    if (subsidy.enhanced_funding_info) {
      setLocalParsedData(subsidy.enhanced_funding_info);
    } else {
      // Try local parsing first as fallback
      const content = [subsidy.title, subsidy.description, subsidy.eligibility, subsidy.funding_markdown]
        .filter(Boolean)
        .join('\n\n');
      
      if (content.trim()) {
        const parsed = FrenchSubsidyParser.parse(content);
        if (parsed.confidence > 0.3) {
          setLocalParsedData(parsed);
        }
      }
    }
  }, [subsidy]);
  
  // Get enhanced funding display or fall back to original
  const getEnhancedFundingDisplay = () => {
    if (localParsedData && localParsedData.funding) {
      return getFundingDisplay(localParsedData);
    }
    
    // Fallback to local parsing
    if (subsidy.description || subsidy.funding_markdown) {
      const content = [subsidy.description, subsidy.funding_markdown].filter(Boolean).join('\n\n');
      return FrenchSubsidyParser.formatFundingDisplay(
        FrenchSubsidyParser.parse(content).funding
      );
    }
    
    // Original fallback
    if (subsidy.amount_min && subsidy.amount_max) {
      return `€${subsidy.amount_min.toLocaleString()} - €${subsidy.amount_max.toLocaleString()}`;
    }
    if (subsidy.amount) {
      return `€${subsidy.amount.toLocaleString()}`;
    }
    return 'Variable Amount';
  };

  // Get enhanced eligibility display
  const getEnhancedEligibilityDisplay = () => {
    if (localParsedData?.eligibility) {
      const eligibilityTypes = getEligibilityDisplay(localParsedData);
      return eligibilityTypes.length > 0 ? eligibilityTypes : ['All Businesses'];
    }
    return ['All Businesses'];
  };

  // Get organization name for logo
  const getOrganizationName = () => {
    return subsidy.agency || subsidy.lesAidesData?.agency || 'Organization';
  };

  // Get clean region display
  const getRegionDisplay = () => {
    if (!subsidy.region || subsidy.region === 'All regions') {
      return 'National';
    }
    if (Array.isArray(subsidy.region)) {
      return subsidy.region[0];
    }
    return subsidy.region;
  };

  // Get deadline display with urgency
  const getDeadlineInfo = () => {
    if (!subsidy.deadline) return null;
    
    const deadline = new Date(subsidy.deadline);
    const now = new Date();
    const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let urgencyColor = 'text-muted-foreground';
    let urgencyBg = 'bg-muted';
    let Icon = Calendar;
    
    if (daysLeft < 0) {
      urgencyColor = 'text-destructive';
      urgencyBg = 'bg-destructive/10';
      Icon = AlertCircle;
    } else if (daysLeft <= 7) {
      urgencyColor = 'text-orange-600';
      urgencyBg = 'bg-orange-100';
      Icon = Clock;
    } else if (daysLeft <= 30) {
      urgencyColor = 'text-yellow-600';
      urgencyBg = 'bg-yellow-100';
      Icon = Clock;
    } else {
      urgencyColor = 'text-emerald-600';
      urgencyBg = 'bg-emerald-100';
      Icon = CheckCircle;
    }
    
    return {
      date: deadline.toLocaleDateString('fr-FR'),
      daysLeft,
      urgencyColor,
      urgencyBg,
      Icon,
      isClosed: daysLeft < 0
    };
  };

  const deadlineInfo = getDeadlineInfo();
  const isClosed = deadlineInfo?.isClosed || deadlineStatus.status === 'Application closed';
  const enhancedFunding = getEnhancedFundingDisplay();
  const enhancedEligibility = getEnhancedEligibilityDisplay();

  return (
    <Card className="group hover:shadow-xl transition-all duration-500 border border-border/50 bg-card hover:border-primary/20 overflow-hidden">
      <CardContent className="p-0">
        {/* Status Bar */}
        <div className={`h-1.5 w-full ${isClosed ? 'bg-destructive' : 'bg-gradient-to-r from-primary via-purple-500 to-blue-500'}`} />
        
        {/* Header Section */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-4">
            {/* Organization Logo & Info */}
            <div className="flex items-start gap-4 flex-1">
              <OrganizationLogo 
                organizationName={getOrganizationName()} 
                size="lg"
                className="w-14 h-14 rounded-xl shadow-sm border border-border shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                {/* Badges Row */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
                    Grant
                  </Badge>
                  {localParsedData?.confidence && localParsedData.confidence > 0.7 && (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
                      <Zap className="w-3 h-3 mr-1" />
                      AI Enhanced
                    </Badge>
                  )}
                  {showMatchScore && (
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 font-medium">
                      {subsidy.matchConfidence}% {t('subsidies.matchConfidence')}
                    </Badge>
                  )}
                  {deadlineInfo && (
                    <Badge 
                      variant="outline" 
                      className={`${deadlineInfo.urgencyBg} ${deadlineInfo.urgencyColor} border-current/20`}
                    >
                      <deadlineInfo.Icon className="w-3 h-3 mr-1" />
                      {deadlineInfo.daysLeft < 0 
                        ? 'Closed'
                        : deadlineInfo.daysLeft === 0 
                        ? 'Today'
                        : `${deadlineInfo.daysLeft}j`
                      }
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                  {getSubsidyTitle(subsidy)}
                </h3>
                
                {/* Agency */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4" />
                  <span className="truncate font-medium">{getOrganizationName()}</span>
                </div>
              </div>
            </div>
            
            {/* Favorite Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onFavorite?.(subsidy.id)}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Heart className={`w-5 h-5 ${isFavorited ? 'fill-destructive text-destructive' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 pb-4">
          <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
            {getSubsidyDescription(subsidy)}
          </p>
        </div>

        {/* Key Information Grid - Enhanced with AI Data */}
        <div className="px-6 pb-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Eligibility */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('subsidies.eligibilityCriteria')}
              </span>
              <div className="flex flex-wrap gap-1">
                {enhancedEligibility.slice(0, 2).map((type, index) => (
                  <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    {type}
                  </Badge>
                ))}
                {enhancedEligibility.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{enhancedEligibility.length - 2}
                  </span>
                )}
              </div>
            </div>

            {/* Geographic Coverage */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('subsidies.region')}
              </span>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {getRegionDisplay()}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Funding Section */}
        <div className="mx-6 mb-6 p-5 bg-gradient-to-br from-primary/5 via-purple-50/80 to-blue-50/80 border border-primary/10 rounded-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Euro className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Funding
                  </p>
                  {localParsedData?.confidence && localParsedData.confidence > 0.7 && (
                    <Zap className="h-3 w-3 text-primary" />
                  )}
                </div>
                <p className="text-2xl font-bold text-primary">
                  {enhancedFunding}
                </p>
                {localParsedData?.funding?.conditions && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {localParsedData.funding.conditions}
                  </p>
                )}
              </div>
            </div>
            
            {deadlineInfo && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('subsidies.deadline')}
                </p>
                <p className={`text-sm font-semibold ${deadlineInfo.urgencyColor}`}>
                  {deadlineInfo.date}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6">
          <div className="flex gap-3">
            <Button 
              className="flex-1 font-medium"
              onClick={() => navigate(`/subsidy/${subsidy.id}`)}
              disabled={isClosed}
            >
              {t('common.viewDetails')}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => window.open(subsidy.source_url || '#', '_blank')}
              className="shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};