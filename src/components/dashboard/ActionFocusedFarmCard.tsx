import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Calendar, 
  Euro, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Farm {
  id: string;
  name: string;
  address: string;
  department?: string | null;
  total_hectares?: number | null;
  created_at: string;
  updated_at?: string | null;
  status?: 'Profile Complete' | 'Incomplete' | 'Pending';
  tags?: string[];
  livestock?: any;
  land_use_types?: string[];
}

interface NextAction {
  type: 'grant_application' | 'profile_completion' | 'document_upload' | 'compliance_check';
  title: string;
  description: string;
  value: string;
  deadline?: string;
  daysLeft?: number;
  priority: 'high' | 'medium' | 'low';
  cta: string;
  route: string;
}

interface ActionFocusedFarmCardProps {
  farm: Farm;
}

const ActionFocusedFarmCard: React.FC<ActionFocusedFarmCardProps> = ({ farm }) => {
  const navigate = useNavigate();

  // Calculate next action based on farm data and priorities
  const calculateNextAction = (farm: Farm): NextAction => {
    const hasCompleteProfile = farm.status === 'Profile Complete';
    const hasSize = farm.total_hectares && farm.total_hectares > 0;
    const hasLocation = farm.department;
    const isOrganic = farm.land_use_types?.includes('organic');
    const hasLivestock = farm.livestock && Object.keys(farm.livestock).length > 0;
    const hectares = farm.total_hectares || 0;

    // Priority 1: Critical profile issues (revenue blocking)
    if (!hasCompleteProfile) {
      return {
        type: 'profile_completion',
        title: `${farm.name}: Complete Profile`,
        description: 'Missing information blocks €45,000 in funding applications',
        value: '€45,000 blocked',
        priority: 'high',
        cta: 'Complete Profile',
        route: `/farm/${farm.id}/edit`
      };
    }

    if (!hasSize || !hasLocation) {
      return {
        type: 'document_upload',
        title: `${farm.name}: Add Farm Details`,
        description: 'Land size and location required for eligibility matching',
        value: 'Eligibility blocked',
        priority: 'high',
        cta: 'Add Details',
        route: `/farm/${farm.id}/edit`
      };
    }

    // Priority 2: High-value opportunities with deadlines
    if (isOrganic && hectares > 20) {
      return {
        type: 'grant_application',
        title: `${farm.name}: Apply for Organic Transition Grant`,
        description: `${hectares} ha organic farm → Perfect match for transition funding`,
        value: '€25,000',
        deadline: 'March 15, 2024',
        daysLeft: 12,
        priority: 'high',
        cta: 'Start Application',
        route: `/subsidies/organic-transition-grant`
      };
    }

    if (hasLivestock && hectares > 50) {
      return {
        type: 'grant_application',
        title: `${farm.name}: Apply for Equipment Modernization`,
        description: `Large livestock operation → Eligible for modernization grants`,
        value: '€40,000',
        deadline: 'April 30, 2024',
        daysLeft: 45,
        priority: 'medium',
        cta: 'Start Application',
        route: `/subsidies/equipment-modernization`
      };
    }

    // Priority 3: General opportunities
    if (hectares > 10) {
      return {
        type: 'grant_application',
        title: `${farm.name}: Apply for Regional Development Aid`,
        description: `${hectares} ha farm → Matched to 3 available programs`,
        value: '€15,000',
        deadline: 'June 1, 2024',
        daysLeft: 90,
        priority: 'medium',
        cta: 'View Opportunities',
        route: `/farm/${farm.id}/opportunities`
      };
    }

    // Fallback: Basic funding opportunities
    return {
      type: 'grant_application',
      title: `${farm.name}: Explore Funding Options`,
      description: 'Small farm programs and training grants available',
      value: '€5,000',
      priority: 'low',  
      cta: 'Explore Options',
      route: `/farm/${farm.id}/opportunities`
    };
  };

  const nextAction = calculateNextAction(farm);

  const getPriorityBadge = (priority: string, daysLeft?: number) => {
    if (priority === 'high' || (daysLeft && daysLeft <= 7)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {daysLeft && daysLeft <= 7 ? `${daysLeft} days left` : 'High Priority'}
        </Badge>
      );
    }
    
    if (priority === 'medium' || (daysLeft && daysLeft <= 30)) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-orange-100 text-orange-800 hover:bg-orange-200">
          <Clock className="h-3 w-3" />
          {daysLeft && daysLeft <= 30 ? `${daysLeft} days left` : 'Opportunity'}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Target className="h-3 w-3" />
        Available
      </Badge>
    );
  };

  const getValueDisplay = (action: NextAction) => {
    if (action.value.includes('€')) {
      return (
        <div className="flex items-center gap-1 text-green-700 font-semibold">
          <Euro className="h-4 w-4" />
          {action.value.replace('€', '')}
        </div>
      );
    }
    return (
      <div className="text-orange-600 font-medium text-sm">
        {action.value}
      </div>
    );
  };

  const handlePrimaryAction = () => {
    navigate(nextAction.route);
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 h-full">
      <CardContent className="p-6">
        {/* Header with Priority */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground truncate">
              {nextAction.title}
            </h3>
            <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
              {nextAction.description}
            </p>
          </div>
          <div className="ml-3 flex-shrink-0">
            {getPriorityBadge(nextAction.priority, nextAction.daysLeft)}
          </div>
        </div>

        {/* Value and Deadline */}
        <div className="flex items-center justify-between mb-4 py-3 px-4 bg-muted/30 rounded-lg">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Value</div>
            {getValueDisplay(nextAction)}
          </div>
          {nextAction.deadline && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Deadline</div>
              <div className="flex items-center gap-1 text-sm font-medium">
                <Calendar className="h-3 w-3" />
                {nextAction.deadline}
              </div>
            </div>
          )}
        </div>

        {/* Farm Context */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pb-4 border-b">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {farm.department || 'Location TBD'}
          </div>
          {farm.total_hectares && (
            <div className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {farm.total_hectares} ha
            </div>
          )}
          <div className="flex items-center gap-1">
            {farm.land_use_types?.join(', ') || 'Mixed farming'}
          </div>
        </div>

        {/* Single Clear Action */}
        <Button 
          onClick={handlePrimaryAction}
          className="w-full"
          variant={nextAction.priority === 'high' ? 'default' : 'outline'}
        >
          {nextAction.cta}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ActionFocusedFarmCard;