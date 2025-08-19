
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Calendar, MapPin, Euro, Clock, Building2, Bookmark, ExternalLink, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import EmptySubsidyState from './EmptySubsidyState';
import SubsidyLoadingCard from './SubsidyLoadingCard';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';

interface Subsidy {
  id: string;
  title: any;
  description: any;
  region: string | string[] | null; // Updated to handle different data types
  categories?: string[]; // Made optional since subsidies_structured uses sector
  sector?: string; // Added for subsidies_structured
  funding_type: string;
  deadline: string;
  amount_min?: number; // Made optional for subsidies_structured
  amount_max?: number; // Made optional for subsidies_structured
  amount?: number; // Added for subsidies_structured
  agency?: string; // Added for subsidies_structured
  matchConfidence: number;
}

interface SearchResultsPanelProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  subsidies: Subsidy[];
  totalCount: number;
  filteredCount: number;
  loading: boolean;
  error: string | null;
  farmId?: string; // Now optional
  onClearFilters?: () => void;
}

import { formatFundingAmount, getSubsidyTitle, getSubsidyDescription, getRegionDisplay, getDeadlineStatus, getSectorDisplayString, formatFilterLabel } from '@/utils/subsidyFormatting';

const SubsidyCard = ({ subsidy, showMatchScore }: { subsidy: Subsidy; showMatchScore: boolean }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const deadlineStatus = getDeadlineStatus(subsidy.deadline);
  
  // Get status color and icon based on deadline
  const getStatusDisplay = () => {
    if (deadlineStatus.status === 'Application closed') {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'bg-red-50 text-red-700 border-red-200',
        text: 'Application Closed'
      };
    } else if (deadlineStatus.urgent) {
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        text: 'Closing Soon'
      };
    } else {
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'bg-green-50 text-green-700 border-green-200',
        text: 'Open for Applications'
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary h-full flex flex-col">
      {/* Header Section */}
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg leading-tight mb-2 text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {getSubsidyTitle(subsidy)}
            </h3>
            
            {/* Status Badge - Most Prominent */}
            <div className="flex items-center gap-2 mb-3">
              <Badge className={`${statusDisplay.color} border font-medium px-3 py-1 text-sm flex items-center gap-1.5`}>
                {statusDisplay.icon}
                {statusDisplay.text}
              </Badge>
              {showMatchScore && (
                <Badge 
                  variant={subsidy.matchConfidence > 70 ? 'default' : 'secondary'}
                  className="font-medium"
                >
                  {subsidy.matchConfidence}% match
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Funding Amount */}
          {(subsidy.amount || subsidy.amount_min) && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
              <Euro className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground font-medium">Funding</div>
                <div className="font-semibold text-primary truncate">
                  {subsidy.amount ? formatFundingAmount(subsidy.amount) : 
                   `${formatFundingAmount(subsidy.amount_min!)} - ${formatFundingAmount(subsidy.amount_max!)}`}
                </div>
              </div>
            </div>
          )}

          {/* Deadline */}
          {subsidy.deadline && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
              <Calendar className={`w-4 h-4 flex-shrink-0 ${deadlineStatus.urgent ? 'text-amber-600' : 'text-muted-foreground'}`} />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground font-medium">Deadline</div>
                <div className={`font-semibold truncate ${deadlineStatus.urgent ? 'text-amber-700' : ''}`}>
                  {deadlineStatus.status}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
          {getSubsidyDescription(subsidy)}
        </p>

        {/* Metadata Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {subsidy.sector && (
            <Badge variant="outline" className="text-xs font-medium bg-background">
              <Building2 className="w-3 h-3 mr-1" />
              {getSectorDisplayString(subsidy.sector)}
            </Badge>
          )}
          {subsidy.region && (
            <Badge variant="outline" className="text-xs font-medium bg-background">
              <MapPin className="w-3 h-3 mr-1" />
              {getRegionDisplay(subsidy.region)}
            </Badge>
          )}
          {subsidy.funding_type && (
            <Badge variant="outline" className="text-xs font-medium bg-background">
              {formatFilterLabel(subsidy.funding_type)}
            </Badge>
          )}
          {subsidy.agency && (
            <Badge variant="outline" className="text-xs font-medium bg-background">
              {subsidy.agency}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-auto">
          <Button 
            size="sm" 
            className="flex-1 font-medium"
            onClick={() => navigate(`/subsidy/${subsidy.id}`)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Details
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              // TODO: Implement save functionality
            }}
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const SearchResultsPanel: React.FC<SearchResultsPanelProps> = ({
  searchQuery,
  onSearchQueryChange,
  showFilters,
  onToggleFilters,
  subsidies,
  totalCount,
  filteredCount,
  loading,
  error,
  farmId,
  onClearFilters
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  if (error) {
    return (
      <div className="space-y-6">
        {/* Search Header */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search grants and subsidies..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="pl-10 h-12 text-base border-2 focus:border-primary/30"
                />
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="py-8">
            <EmptySubsidyState 
              type="error"
              error={error}
              onRetry={() => navigate(0)}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search grants and subsidies..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-10 h-12 text-base border-2 focus:border-primary/30"
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => onSearchQueryChange('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Results Summary */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span className="font-medium">
                  {loading ? 'Searching...' : `${filteredCount} of ${totalCount} results`}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Results Section */}
      <div className="space-y-4">
        {/* Results Header */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-foreground">Available Funding</h2>
          {!loading && subsidies.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Updated daily</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SubsidyLoadingCard key={index} />
            ))}
          </div>
        ) : subsidies.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <EmptySubsidyState 
                type={totalCount === 0 ? 'no-data' : 'no-results'}
                searchQuery={searchQuery}
                onClearFilters={onClearFilters}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {subsidies.map((subsidy) => (
              <SubsidyCard 
                key={subsidy.id} 
                subsidy={subsidy} 
                showMatchScore={!!farmId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPanel;
