import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Euro, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSimplifiedSubsidyParser } from '@/hooks/useSimplifiedSubsidyParser';

interface SimplifiedSubsidyCardProps {
  subsidy: any;
}

// Helper function to extract string value from multilingual objects
function getStringValue(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value.fr || value.en || value.ro || Object.values(value)[0] || '';
  }
  return String(value);
}

export const SimplifiedSubsidyCard: React.FC<SimplifiedSubsidyCardProps> = ({ subsidy }) => {
  const navigate = useNavigate();
  const { funding, entityTypes, region, confidence } = useSimplifiedSubsidyParser(subsidy);
  
  const title = getStringValue(subsidy.title) || 'Titre non disponible';
  const description = getStringValue(subsidy.description) || 'Description non disponible';
  const agency = getStringValue(subsidy.agency) || 'Organisation';

  return (
    <Card className="group hover:shadow-lg transition-all duration-300">
      <CardContent className="p-6">
        {/* Confidence indicator */}
        {confidence > 0.7 && (
          <div className="mb-3">
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              ✨ Données enrichies ({Math.round(confidence * 100)}%)
            </Badge>
          </div>
        )}

        {/* Title & Agency */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {title}
          </h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span>{agency}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {description}
        </p>

        {/* Key Information Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Entity Types */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Éligibilité
            </span>
            <div className="flex flex-wrap gap-1">
              {entityTypes.slice(0, 2).map((type, index) => (
                <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                  {type}
                </Badge>
              ))}
              {entityTypes.length > 2 && (
                <span className="text-xs text-muted-foreground">+{entityTypes.length - 2}</span>
              )}
            </div>
          </div>

          {/* Region */}
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">
              Région
            </span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {region}
            </Badge>
          </div>
        </div>

        {/* Funding Section */}
        <div className="mb-4 p-4 bg-gradient-to-br from-primary/5 to-purple-50 rounded-lg border border-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Euro className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Financement</p>
              <p className="text-lg font-bold text-primary">{funding}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            className="flex-1"
            onClick={() => navigate(`/subsidy/${subsidy.id}`)}
          >
            Voir les détails
          </Button>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => window.open(subsidy.source_url || '#', '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};