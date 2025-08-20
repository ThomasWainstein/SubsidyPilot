import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, MapPin, Euro, Building2, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import EmptySubsidyState from './EmptySubsidyState';
import SubsidyLoadingCard from './SubsidyLoadingCard';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/language';
import { parseEnhancedFundingAmount, getSubsidyTitle, getSubsidyDescription, getDeadlineStatus } from '@/utils/subsidyFormatting';
import { getSectorDisplayFromDomains, getEligibilityStatus } from '@/utils/sectorMappings';
import OrganizationLogo from '../OrganizationLogo';

interface Subsidy {
  id: string;
  title: any;
  description: any;
  region: string | string[] | null;
  categories?: string[];
  sector?: string | string[];
  funding_type: string;
  deadline: string;
  amount_min?: number;
  amount_max?: number;
  amount?: number;
  agency?: string;
  matchConfidence: number;
  raw_data?: any;
  lesAidesData?: any;
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
  farmId?: string;
  onClearFilters?: () => void;
}

const CleanSubsidyCard = ({ subsidy, showMatchScore }: { subsidy: Subsidy; showMatchScore: boolean }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const deadlineStatus = getDeadlineStatus(subsidy.deadline);
  const eligibilityStatus = getEligibilityStatus(subsidy);
  
  // Check if application is closed
  const isClosed = deadlineStatus.status === 'Application closed';
  
  // Get clean funding amount
  const getFundingAmount = () => {
    const enhancedAmount = parseEnhancedFundingAmount(subsidy, subsidy.lesAidesData);
    if (enhancedAmount && enhancedAmount !== 'Not specified') {
      return enhancedAmount;
    }
    
    if (subsidy.amount_min && subsidy.amount_max) {
      return `€${subsidy.amount_min.toLocaleString()} - €${subsidy.amount_max.toLocaleString()}`;
    }
    
    if (subsidy.amount) {
      return `€${subsidy.amount.toLocaleString()}`;
    }
    
    return 'Amount varies';
  };
  
  // Get clean sector display
  const getTargetAudience = () => {
    if (subsidy.sector) {
      const sectors = getSectorDisplayFromDomains(subsidy.sector);
      if (sectors !== 'All sectors') {
        return sectors;
      }
    }
    
    // Fallback to broad categories
    if (subsidy.funding_type?.toLowerCase().includes('agriculture')) {
      return 'Agricultural businesses';
    }
    
    return 'All business types';
  };
  
  // Get clean region display
  const getRegionDisplay = () => {
    if (!subsidy.region || subsidy.region === 'All regions') {
      return 'Available nationwide';
    }
    
    if (Array.isArray(subsidy.region)) {
      if (subsidy.region.length === 1) {
        return subsidy.region[0];
      }
      return `${subsidy.region.slice(0, 2).join(', ')}${subsidy.region.length > 2 ? ` +${subsidy.region.length - 2} more` : ''}`;
    }
    
    return subsidy.region;
  };

  // If closed, show minimal card
  if (isClosed) {
    return (
      <Card className="opacity-60 border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-600 line-clamp-1 mb-1">
                {getSubsidyTitle(subsidy)}
              </h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Application Closed
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => navigate(`/subsidy/${subsidy.id}`)}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20 hover:border-l-primary h-[420px]">
      <CardContent className="p-6 h-full flex flex-col">
        {/* Main Header - Fixed height section */}
        <div className="flex-shrink-0 space-y-3 mb-4">
          {/* Title and Provider - Fixed height */}
          <div className="h-16 flex justify-between items-start">
            <div className="flex-1 pr-3">
              <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1 leading-tight">
                {getSubsidyTitle(subsidy)}
              </h3>
              {subsidy.agency && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {subsidy.agency}
                </p>
              )}
            </div>
            {subsidy.agency && (
              <div className="flex-shrink-0">
                <OrganizationLogo organizationName={subsidy.agency} size="lg" />
              </div>
            )}
          </div>
          
          {/* Target Audience - Fixed height */}
          <div className="h-12">
            <p className="text-sm font-medium text-foreground mb-1">For:</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0.5">
                <Building2 className="w-3 h-3 mr-1" />
                <span className="truncate max-w-24">{getTargetAudience()}</span>
              </Badge>
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0.5">
                <MapPin className="w-3 h-3 mr-1" />
                <span className="truncate max-w-20">{getRegionDisplay()}</span>
              </Badge>
            </div>
          </div>
        </div>
          
        {/* Flexible content area */}
        <div className="flex-1 flex flex-col justify-between">
          {/* Status and Eligibility */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {deadlineStatus.urgent ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  <span className="truncate">Urgent</span>
                </Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  <span className="truncate">Open</span>
                </Badge>
              )}
              
              {showMatchScore && (
                <Badge 
                  variant={subsidy.matchConfidence > 70 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {subsidy.matchConfidence}%
                </Badge>
              )}
            </div>
            
            {/* Simple eligibility indicator */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {eligibilityStatus.status === 'eligible' ? (
                <CheckCircle2 className="w-3 h-3 text-green-600" />
              ) : eligibilityStatus.status === 'restricted' ? (
                <MapPin className="w-3 h-3 text-blue-600" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-amber-600" />
              )}
              <span className="truncate">{eligibilityStatus.label}</span>
            </div>
          </div>
          
          {/* Funding Amount - Aligned section */}
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-4 h-20 flex items-center">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2 rounded-full bg-primary/20 flex-shrink-0">
                <Euro className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Available Funding</p>
                <p className="text-lg font-bold text-primary truncate">
                  {getFundingAmount()}
                </p>
              </div>
            </div>
          </div>
          
          {/* Action Button - Aligned at bottom */}
          <Button 
            className="w-full font-medium h-11"
            onClick={() => navigate(`/subsidy/${subsidy.id}`)}
          >
            {eligibilityStatus.status === 'eligible' ? 'Apply Now' : 'Learn More'}
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
  
  // Group subsidies by status
  const openSubsidies = subsidies.filter(s => getDeadlineStatus(s.deadline).status !== 'Application closed');
  const urgentSubsidies = openSubsidies.filter(s => getDeadlineStatus(s.deadline).urgent);
  const closedSubsidies = subsidies.filter(s => getDeadlineStatus(s.deadline).status === 'Application closed');
  
  // Calculate total funding
  const totalFunding = openSubsidies.reduce((sum, subsidy) => {
    const amount = subsidy.amount_max || subsidy.amount || 0;
    return sum + amount;
  }, 0);
  
  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for funding opportunities, grants, or programs..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </CardHeader>
        </Card>
        <Card>
          <CardContent className="py-8">
            <EmptySubsidyState 
              type="error"
              error={error}
              onRetry={() => window.location.reload()}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clean Search Header */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="space-y-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for funding opportunities, grants, or programs..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                className="pl-10 h-12"
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => onSearchQueryChange('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-muted-foreground">
                {loading ? 'Searching...' : `${filteredCount} of ${totalCount} results`}
              </div>
              {totalFunding > 0 && (
                <div className="text-primary font-medium">
                  €{totalFunding.toLocaleString()} total funding available
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Results Status Overview */}
      {!loading && subsidies.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">{openSubsidies.length}</div>
              <div className="text-sm text-green-600">Open ({urgentSubsidies.length > 0 ? `${urgentSubsidies.length} urgent` : 'no urgent'})</div>
            </CardContent>
          </Card>
          
          {urgentSubsidies.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{urgentSubsidies.length}</div>
                <div className="text-sm text-amber-600">Closing Soon</div>
              </CardContent>
            </Card>
          )}
          
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4 text-center">
              <div className="text-sm text-blue-600">Last updated:</div>
              <div className="font-medium text-blue-700">2 hours ago</div>
            </CardContent>
          </Card>
        </div>
      )}

          {/* Results Grid */}
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                {[...Array(8)].map((_, i) => (
                  <SubsidyLoadingCard key={i} />
                ))}
              </div>
            ) : subsidies.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <EmptySubsidyState 
                    type="no-results"
                    searchQuery={searchQuery}
                    onClearFilters={onClearFilters}
                  />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Open Subsidies */}
                {openSubsidies.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">
                      Available Funding Opportunities
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        Funding programs currently accepting applications
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                      {openSubsidies.map((subsidy) => (
                        <CleanSubsidyCard 
                          key={subsidy.id} 
                          subsidy={subsidy} 
                          showMatchScore={Boolean(farmId)}
                        />
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Closed Subsidies */}
                {closedSubsidies.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-4 text-muted-foreground">
                      Recently Closed ({closedSubsidies.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                      {closedSubsidies.slice(0, 8).map((subsidy) => (
                        <CleanSubsidyCard 
                          key={subsidy.id} 
                          subsidy={subsidy} 
                          showMatchScore={false}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
      
      {/* Simple Tips */}
      {!loading && openSubsidies.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div className="text-sm text-blue-700">
                <strong>Tip:</strong> Applications submitted early in the funding period typically have higher approval rates. 
                Click "Learn More" to check detailed requirements before applying.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SearchResultsPanel;