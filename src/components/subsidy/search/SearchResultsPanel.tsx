
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
  
  // Check if application is closed
  const isClosed = deadlineStatus.status === 'Application closed';
  
  // Get status display with better urgency indicators
  const getStatusDisplay = () => {
    if (isClosed) {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'bg-red-50 text-red-600 border-red-200',
        text: 'Application Closed',
        priority: 'closed'
      };
    } else if (deadlineStatus.urgent && deadlineStatus.daysLeft !== undefined) {
      const daysText = deadlineStatus.daysLeft === 0 ? 'Today' : 
                     deadlineStatus.daysLeft === 1 ? 'Tomorrow' : 
                     `${deadlineStatus.daysLeft} days`;
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        text: `Closes ${daysText}`,
        priority: 'urgent'
      };
    } else {
      const deadlineText = subsidy.deadline ? 
        `Open until ${new Date(subsidy.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` :
        'Open Application';
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'bg-green-50 text-green-700 border-green-200',
        text: deadlineText,
        priority: 'open'
      };
    }
  };

  const statusDisplay = getStatusDisplay();

  // Get funding display with better formatting
  const getFundingDisplay = () => {
    if (subsidy.amount) {
      return {
        amount: formatFundingAmount(subsidy.amount),
        type: 'fixed'
      };
    } else if (subsidy.amount_min && subsidy.amount_max) {
      return {
        amount: `${formatFundingAmount(subsidy.amount_min)} - ${formatFundingAmount(subsidy.amount_max)}`,
        type: 'range'
      };
    } else if (subsidy.amount_min) {
      return {
        amount: `From ${formatFundingAmount(subsidy.amount_min)}`,
        type: 'minimum'
      };
    }
    return {
      amount: 'Amount varies',
      type: 'variable'
    };
  };

  const fundingDisplay = getFundingDisplay();

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 h-full flex flex-col
      ${isClosed ? 'opacity-60 hover:opacity-80 border-l-4 border-l-red-300' : 
                   statusDisplay.priority === 'urgent' ? 'border-l-4 border-l-amber-400 hover:border-l-amber-500' :
                   'border-l-4 border-l-primary/20 hover:border-l-primary'}`}
    >
      {/* Header Section */}
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-lg leading-tight mb-2 group-hover:text-primary transition-colors line-clamp-2
              ${isClosed ? 'text-muted-foreground' : 'text-foreground'}`}>
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

        {/* Key Info Grid - Funding Amount Most Prominent */}
        <div className="space-y-3">
          {/* Funding Amount - Hero Section */}
          <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Funding Available</div>
                <div className="text-lg font-bold text-primary">
                  {fundingDisplay.amount}
                </div>
                {fundingDisplay.type === 'range' && (
                  <div className="text-xs text-muted-foreground">Depends on project size</div>
                )}
              </div>
            </div>
          </div>

          {/* Secondary Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {/* Deadline Details */}
            {subsidy.deadline && !isClosed && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                <Calendar className={`w-4 h-4 flex-shrink-0 ${deadlineStatus.urgent ? 'text-amber-600' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground font-medium">Application Deadline</div>
                  <div className={`font-semibold truncate ${deadlineStatus.urgent ? 'text-amber-700' : ''}`}>
                    {new Date(subsidy.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )}

            {/* Eligibility Preview */}
            {(subsidy.region || subsidy.sector) && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground font-medium">Eligible For</div>
                  <div className="font-semibold truncate">
                    {subsidy.sector ? getSectorDisplayString(subsidy.sector) : 
                     subsidy.region ? getRegionDisplay(subsidy.region) : 'Check details'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content Section */}
      <CardContent className="pt-0 flex-1 flex flex-col">
        {/* Key Benefits as Bullet Points */}
        <div className="mb-4 flex-1">
          <div className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {getSubsidyDescription(subsidy)}
          </div>
          
          {/* Quick eligibility check */}
          {(subsidy.region || subsidy.sector) && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-green-600" />
              <span>Eligibility: {subsidy.region ? getRegionDisplay(subsidy.region) : 'All regions'}</span>
            </div>
          )}
        </div>

        {/* Enhanced Metadata Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {subsidy.agency && (
            <Badge variant="outline" className="text-xs font-medium bg-background border-primary/30 text-primary">
              <Building2 className="w-3 h-3 mr-1" />
              {subsidy.agency}
            </Badge>
          )}
          {subsidy.funding_type && (
            <Badge variant="outline" className="text-xs font-medium bg-blue-50 border-blue-200 text-blue-700">
              {formatFilterLabel(subsidy.funding_type)}
            </Badge>
          )}
          {subsidy.region && (
            <Badge variant="outline" className="text-xs font-medium bg-green-50 border-green-200 text-green-700">
              <MapPin className="w-3 h-3 mr-1" />
              {getRegionDisplay(subsidy.region)}
            </Badge>
          )}
          {!isClosed && deadlineStatus.urgent && (
            <Badge className="text-xs font-medium bg-amber-100 border-amber-300 text-amber-800">
              <Clock className="w-3 h-3 mr-1" />
              Urgent
            </Badge>
          )}
        </div>

        {/* Enhanced Action Buttons */}
        <div className="flex gap-2 mt-auto">
          <Button 
            size="sm" 
            className="flex-1 font-medium"
            onClick={() => navigate(`/subsidy/${subsidy.id}`)}
            variant={isClosed ? "outline" : "default"}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {isClosed ? 'View Archive' : 'View Details'}
          </Button>
          {!isClosed && (
            <Button 
              variant="outline" 
              size="sm"
              className="px-3 border-2 hover:bg-primary/10 hover:border-primary/30"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement save functionality
              }}
            >
              <Bookmark className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Application Complexity Indicator */}
        {!isClosed && (
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Simple application</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Est. 2-3 weeks processing</span>
            </div>
          </div>
        )}
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
        {/* Results Header with Quick Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-2xl font-bold text-foreground">Available Funding</h2>
          
          <div className="flex items-center gap-3">
            {/* Quick Status Filters */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs px-3 py-1.5">
                <CheckCircle2 className="w-3 h-3 mr-1 text-green-600" />
                Open ({subsidies.filter(s => getDeadlineStatus(s.deadline).status !== 'Application closed').length})
              </Button>
              <Button variant="outline" size="sm" className="text-xs px-3 py-1.5">
                <AlertTriangle className="w-3 h-3 mr-1 text-amber-600" />
                Urgent ({subsidies.filter(s => getDeadlineStatus(s.deadline).urgent).length})
              </Button>
            </div>
            
            {!loading && subsidies.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Updated daily</span>
              </div>
            )}
          </div>
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
          <div className="space-y-6">
            {/* Results with smart sorting - open applications first */}
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {subsidies
                .sort((a, b) => {
                  const aStatus = getDeadlineStatus(a.deadline);
                  const bStatus = getDeadlineStatus(b.deadline);
                  
                  // Sort by status priority: urgent -> open -> closed
                  const getPriority = (status: any) => {
                    if (status.status === 'Application closed') return 3;
                    if (status.urgent) return 1;
                    return 2;
                  };
                  
                  const aPriority = getPriority(aStatus);
                  const bPriority = getPriority(bStatus);
                  
                  if (aPriority !== bPriority) return aPriority - bPriority;
                  
                  // Within same priority, sort by days left (if applicable)
                  if (aStatus.daysLeft !== undefined && bStatus.daysLeft !== undefined) {
                    return aStatus.daysLeft - bStatus.daysLeft;
                  }
                  
                  return 0;
                })
                .map((subsidy) => (
                  <SubsidyCard 
                    key={subsidy.id} 
                    subsidy={subsidy} 
                    showMatchScore={!!farmId}
                  />
                ))
              }
            </div>
            
            {/* Results Summary Footer */}
            <div className="text-center text-sm text-muted-foreground py-4 border-t">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>{subsidies.filter(s => getDeadlineStatus(s.deadline).status !== 'Application closed').length} open</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                  <span>{subsidies.filter(s => getDeadlineStatus(s.deadline).urgent).length} closing soon</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-400"></div>
                  <span>{subsidies.filter(s => getDeadlineStatus(s.deadline).status === 'Application closed').length} closed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResultsPanel;
