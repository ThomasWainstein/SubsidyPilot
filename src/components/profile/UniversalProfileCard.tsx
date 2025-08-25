import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MoreVertical, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ApplicantType } from "./ApplicantTypeSelector";

interface UniversalProfileCardProps {
  id: string;
  profileName: string;
  applicantType: ApplicantType;
  completionPercentage: number;
  profileData: any;
  blockedFunding?: number;
  urgentItems?: number;
  lastUpdated: string;
}

const getTypeConfig = (type: ApplicantType) => {
  const configs = {
    individual: { icon: '👤', label: 'Individual', color: 'bg-blue-100 text-blue-800' },
    business: { icon: '🏢', label: 'Business', color: 'bg-green-100 text-green-800' },
    nonprofit: { icon: '🤝', label: 'Non-Profit', color: 'bg-purple-100 text-purple-800' },
    municipality: { icon: '🏛️', label: 'Municipality', color: 'bg-orange-100 text-orange-800' }
  };
  return configs[type];
};

export const UniversalProfileCard = ({
  id,
  profileName,
  applicantType,
  completionPercentage,
  profileData,
  blockedFunding = 0,
  urgentItems = 0,
  lastUpdated
}: UniversalProfileCardProps) => {
  const navigate = useNavigate();
  const typeConfig = getTypeConfig(applicantType);
  
  const handleViewProfile = () => {
    navigate(`/profile/${id}`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{typeConfig.icon}</div>
            <div>
              <CardTitle className="text-lg font-medium truncate">{profileName}</CardTitle>
              <Badge className={`text-xs ${typeConfig.color}`}>
                {typeConfig.label}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Completion Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className="text-sm text-muted-foreground">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Key Information */}
        <div className="space-y-2 text-sm">
          {profileData.address && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{profileData.address}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Updated {lastUpdated}</span>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="grid grid-cols-2 gap-3">
          {blockedFunding > 0 && (
            <div className="text-center p-2 bg-orange-50 rounded-lg border">
              <div className="text-sm font-medium text-orange-800">€{blockedFunding.toLocaleString()}</div>
              <div className="text-xs text-orange-600">Blocked Funding</div>
            </div>
          )}
          {urgentItems > 0 && (
            <div className="text-center p-2 bg-red-50 rounded-lg border flex items-center justify-center gap-1">
              <AlertTriangle className="h-3 w-3 text-red-600" />
              <div>
                <div className="text-sm font-medium text-red-800">{urgentItems}</div>
                <div className="text-xs text-red-600">Urgent</div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={handleViewProfile}
          >
            View Profile
          </Button>
          {completionPercentage < 100 && (
            <Button 
              size="sm" 
              className="flex-1"
              onClick={handleViewProfile}
            >
              Complete Profile
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};