import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Filter, AlertTriangle, Clock, CheckCircle, Euro } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UniversalProfileCard } from "../profile/UniversalProfileCard";
import type { ApplicantType } from "../profile/ApplicantTypeSelector";

// Mock data - replace with actual API calls
const mockProfiles = [
  {
    id: '1',
    profileName: 'Green Tech Solutions Ltd.',
    applicantType: 'business' as ApplicantType,
    completionPercentage: 85,
    profileData: { address: 'Berlin, Germany' },
    blockedFunding: 45000,
    urgentItems: 2,
    lastUpdated: '2 days ago'
  },
  {
    id: '2', 
    profileName: 'Maria Rodriguez',
    applicantType: 'individual' as ApplicantType,
    completionPercentage: 65,
    profileData: { address: 'Madrid, Spain' },
    blockedFunding: 12000,
    urgentItems: 1,
    lastUpdated: '1 week ago'
  },
  {
    id: '3',
    profileName: 'Environmental Action NGO',
    applicantType: 'nonprofit' as ApplicantType,
    completionPercentage: 92,
    profileData: { address: 'Amsterdam, Netherlands' },
    blockedFunding: 25000,
    urgentItems: 0,
    lastUpdated: '3 days ago'
  }
];

const mockStats = {
  readyToApply: { count: 8, amount: 125000 },
  needsAction: { count: 5, amount: 67000 },
  urgentDeadlines: { count: 3, daysLeft: 7 },
  totalAvailable: 580000
};

export const UniversalDashboard = () => {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<ApplicantType | 'all'>('all');

  const filteredProfiles = selectedType === 'all' 
    ? mockProfiles 
    : mockProfiles.filter(p => p.applicantType === selectedType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            What should you do today?
          </p>
        </div>
        <Button onClick={() => navigate('/profile/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                {mockStats.readyToApply.count}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium">Ready to Apply</p>
              <p className="text-2xl font-bold text-green-600">
                €{mockStats.readyToApply.amount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {mockStats.readyToApply.count} opportunities available
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                {mockStats.needsAction.count}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium">Needs Action</p>
              <p className="text-2xl font-bold text-orange-600">
                €{mockStats.needsAction.amount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {mockStats.needsAction.count} items blocked
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Clock className="h-5 w-5 text-red-600" />
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                {mockStats.urgentDeadlines.count}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium">Urgent Deadlines</p>
              <p className="text-2xl font-bold text-red-600">
                {mockStats.urgentDeadlines.daysLeft} days
              </p>
              <p className="text-xs text-muted-foreground">
                {mockStats.urgentDeadlines.count} applications due
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Euro className="h-5 w-5 text-primary" />
              <Badge variant="secondary">Total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium">Total Available</p>
              <p className="text-2xl font-bold text-primary">
                €{mockStats.totalAvailable.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Across all sectors
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Management Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Your Profiles</h2>
            <p className="text-sm text-muted-foreground">
              Manage your funding profiles and applications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Search className="h-4 w-4" />
              Find Opportunities
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Profile Type Filter */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
          >
            All Types
          </Button>
          <Button
            variant={selectedType === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('individual')}
          >
            👤 Individual
          </Button>
          <Button
            variant={selectedType === 'business' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('business')}
          >
            🏢 Business
          </Button>
          <Button
            variant={selectedType === 'nonprofit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('nonprofit')}
          >
            🤝 Non-Profit
          </Button>
          <Button
            variant={selectedType === 'municipality' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('municipality')}
          >
            🏛️ Municipality
          </Button>
        </div>

        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => (
            <UniversalProfileCard key={profile.id} {...profile} />
          ))}
          
          {/* Add New Profile Card */}
          <Card 
            className="border-dashed border-2 hover:border-primary cursor-pointer transition-colors"
            onClick={() => navigate('/profile/new')}
          >
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
              <Plus className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Create New Profile</h3>
              <p className="text-sm text-muted-foreground">
                Add a new applicant profile to access more funding opportunities
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <div className="font-medium mb-1">Complete Profile: Green Tech Solutions</div>
              <div className="text-sm text-muted-foreground">Missing business registration documents</div>
              <Badge variant="secondary" className="mt-2">High Priority</Badge>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <div className="font-medium mb-1">Review Application: Innovation Grant</div>
              <div className="text-sm text-muted-foreground">Deadline in 5 days</div>
              <Badge variant="destructive" className="mt-2">Urgent</Badge>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-start">
              <div className="font-medium mb-1">New Match: Environmental Fund</div>
              <div className="text-sm text-muted-foreground">95% compatibility with your NGO profile</div>
              <Badge className="mt-2">New</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};