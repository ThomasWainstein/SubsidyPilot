import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Calendar, MapPin, Euro } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface FrenchSubsidy {
  id: string;
  title: string;
  description: string;
  amount: number[] | null;
  deadline: string | null;
  region: string[] | null;
  sector: string[] | null;
  agency: string;
  eligibility: string;
  program: string;
  funding_type: string;
  application_method: string;
  documents: any[] | null;
  url: string;
  language: string;
}

interface FrenchSubsidyCardProps {
  subsidy: FrenchSubsidy;
  onViewDetails?: (id: string) => void;
  onApply?: (id: string) => void;
}

export function FrenchSubsidyCard({ subsidy, onViewDetails, onApply }: FrenchSubsidyCardProps) {
  const formatFrenchAmount = (amount: number[] | null) => {
    if (!amount || amount.length === 0) return "Montant non spécifié";
    
    if (amount.length === 1) {
      return `${amount[0].toLocaleString('fr-FR')} €`;
    }
    
    return `${amount[0].toLocaleString('fr-FR')} € - ${amount[1].toLocaleString('fr-FR')} €`;
  };

  const formatFrenchDate = (dateString: string | null) => {
    if (!dateString) return "Date limite non spécifiée";
    
    try {
      const date = new Date(dateString);
      return format(date, "d MMMM yyyy", { locale: fr });
    } catch {
      return dateString;
    }
  };

  const getFundingTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'grant':
      case 'subvention':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'loan':
      case 'prêt':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'subsidy':
      case 'aide':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-lg leading-tight line-clamp-2">
            {subsidy.title}
          </CardTitle>
          <Badge variant="outline" className="shrink-0">
            <img 
              src="https://flagcdn.com/w20/fr.png" 
              alt="France" 
              className="w-4 h-3 mr-1"
            />
            FR
          </Badge>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge className={getFundingTypeColor(subsidy.funding_type)}>
            {subsidy.funding_type || 'Aide'}
          </Badge>
          {subsidy.program && (
            <Badge variant="secondary" className="text-xs">
              {subsidy.program}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 gap-4">
        <p className="text-sm text-muted-foreground line-clamp-3">
          {subsidy.description}
        </p>

        <div className="grid grid-cols-1 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Euro className="w-4 h-4 text-green-600" />
            <span className="font-medium">{formatFrenchAmount(subsidy.amount)}</span>
          </div>

          {subsidy.deadline && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>{formatFrenchDate(subsidy.deadline)}</span>
            </div>
          )}

          {subsidy.region && subsidy.region.length > 0 && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div className="flex flex-wrap gap-1">
                {subsidy.region.slice(0, 3).map((region, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {region}
                  </Badge>
                ))}
                {subsidy.region.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{subsidy.region.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {subsidy.sector && subsidy.sector.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {subsidy.sector.slice(0, 4).map((sector, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {sector}
              </Badge>
            ))}
            {subsidy.sector.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{subsidy.sector.length - 4}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-auto pt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(subsidy.id)}
            className="flex-1"
          >
            Voir détails
          </Button>
          
          <Button
            size="sm"
            onClick={() => onApply?.(subsidy.id)}
            className="flex-1"
          >
            Postuler
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(subsidy.url, '_blank')}
            className="p-2"
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>

        {subsidy.documents && subsidy.documents.length > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-2">
            {subsidy.documents.length} document(s) disponible(s)
          </div>
        )}
      </CardContent>
    </Card>
  );
}