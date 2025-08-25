import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, ExternalLink, MapPin, Building2, Calendar, Euro } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSubsidyTitle, getSubsidyDescription } from '@/utils/subsidyFormatting';
import { getDeadlineStatus } from '@/utils/subsidyFormatting';
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
  const deadlineStatus = getDeadlineStatus(subsidy.deadline);
  
  // Get clean funding amount display
  const getFundingDisplay = () => {
    if (subsidy.amount_min && subsidy.amount_max) {
      return `€${subsidy.amount_min.toLocaleString()} - €${subsidy.amount_max.toLocaleString()}`;
    }
    if (subsidy.amount) {
      return `€${subsidy.amount.toLocaleString()}`;
    }
    return 'Montant variable';
  };

  // Get organization name for logo
  const getOrganizationName = () => {
    return subsidy.agency || subsidy.lesAidesData?.agency || 'Organisation';
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

  // Check if application is closed
  const isClosed = deadlineStatus.status === 'Application closed';

  return (
    <Card className={`group hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white ${isClosed ? 'opacity-70' : ''}`}>
      <CardContent className="p-0">
        {/* Header with logo and favorite */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-start gap-4 flex-1">
            {/* Organization Logo */}
            <div className="flex-shrink-0">
              <OrganizationLogo 
                organizationName={getOrganizationName()} 
                size="lg"
                className="w-16 h-16 rounded-lg shadow-sm border border-gray-100"
              />
            </div>
            
            {/* Title and Organization */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2 mb-2">
                <Badge 
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1 text-sm font-medium"
                >
                  Subvention
                </Badge>
                {showMatchScore && (
                  <Badge variant="outline" className="text-xs">
                    {subsidy.matchConfidence}% match
                  </Badge>
                )}
              </div>
              
              <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-2 leading-tight">
                {getSubsidyTitle(subsidy)}
              </h3>
              
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium">
                <Building2 className="w-4 h-4" />
                <span className="truncate">{getOrganizationName()}</span>
              </div>
            </div>
          </div>
          
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onFavorite?.(subsidy.id)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>

        {/* Description */}
        <div className="px-6 pb-4">
          <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
            {getSubsidyDescription(subsidy)}
          </p>
        </div>

        {/* Tags and Details */}
        <div className="px-6 pb-4 space-y-3">
          {/* For and Location tags */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-700 font-medium">Pour:</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                <Building2 className="w-3 h-3 mr-1" />
                Toutes entreprises
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <MapPin className="w-3 h-3 mr-1" />
                {getRegionDisplay()}
              </Badge>
            </div>
          </div>

          {/* Status and Deadline */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {!isClosed ? (
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  Ouvert
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-300">
                  Fermé
                </Badge>
              )}
              {subsidy.region && (
                <span className="text-xs text-gray-500">{getRegionDisplay()}</span>
              )}
            </div>
            
            {subsidy.deadline && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>{new Date(subsidy.deadline).toLocaleDateString('fr-FR')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Funding Amount - Highlighted Section */}
        <div className="mx-6 mb-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-full">
              <Euro className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Financement disponible</p>
              <p className="text-lg font-bold text-purple-600">
                {getFundingDisplay()}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6">
          <div className="flex gap-3">
            <Button 
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium"
              onClick={() => navigate(`/subsidy/${subsidy.id}`)}
              disabled={isClosed}
            >
              En savoir plus
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.open(subsidy.source_url || '#', '_blank')}
              className="text-gray-500 hover:text-purple-600"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};