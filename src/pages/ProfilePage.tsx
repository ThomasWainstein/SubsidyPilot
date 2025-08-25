import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, FileText, Target, History, Settings } from "lucide-react";
import type { ApplicantType } from "@/components/profile/ApplicantTypeSelector";

// Mock profile data - replace with actual API calls
const mockProfile = {
  id: '1',
  profileName: 'Green Tech Solutions Ltd.',
  applicantType: 'business' as ApplicantType,
  completionPercentage: 85,
  profileData: {
    address: 'Friedrichstraße 123, 10117 Berlin, Germany',
    country: 'Germany',
    department: 'Berlin',
    contact_info: {
      phone: '+49 30 12345678',
      email: 'contact@greentech.de'
    },
    business_registration: 'HRB 123456',
    industry: 'Clean Technology',
    employees: '25-50',
    annual_revenue: '€2-5M'
  },
  created_at: '2024-01-15',
  updated_at: '2024-01-20'
};

const getTypeConfig = (type: ApplicantType) => {
  const configs = {
    individual: { icon: '👤', label: 'Individual', color: 'bg-blue-100 text-blue-800' },
    business: { icon: '🏢', label: 'Business', color: 'bg-green-100 text-green-800' },
    nonprofit: { icon: '🤝', label: 'Non-Profit', color: 'bg-purple-100 text-purple-800' },
    municipality: { icon: '🏛️', label: 'Municipality', color: 'bg-orange-100 text-orange-800' }
  };
  return configs[type];
};

const ProfilePage = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(mockProfile);
  const [loading, setLoading] = useState(true);

  const typeConfig = getTypeConfig(profile.applicantType);

  useEffect(() => {
    // TODO: Replace with actual API call
    const loadProfile = async () => {
      try {
        // Simulate API call
        setTimeout(() => {
          setProfile(mockProfile);
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
      }
    };

    loadProfile();
  }, [profileId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      {/* Profile Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="text-4xl">{typeConfig.icon}</div>
              <div>
                <h1 className="text-3xl font-bold">{profile.profileName}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={typeConfig.color}>
                    {typeConfig.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Created {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Completion Status */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Profile Completion</span>
                <span className="text-sm text-muted-foreground">{profile.completionPercentage}%</span>
              </div>
              <Progress value={profile.completionPercentage} className="h-2" />
              {profile.completionPercentage < 100 && (
                <p className="text-xs text-muted-foreground">
                  Complete your profile to access more funding opportunities
                </p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Quick Stats</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>📍 {profile.profileData.address}</div>
                {profile.profileData.contact_info?.email && (
                  <div>📧 {profile.profileData.contact_info.email}</div>
                )}
                {profile.profileData.contact_info?.phone && (
                  <div>📞 {profile.profileData.contact_info.phone}</div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Activity</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>✅ Profile updated 5 days ago</div>
                <div>📄 Document uploaded 1 week ago</div>
                <div>🎯 New match found 2 weeks ago</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="opportunities" className="gap-2">
            <Target className="h-4 w-4" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="applications" className="gap-2">
            <FileText className="h-4 w-4" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address</label>
                    <p className="text-sm">{profile.profileData.address}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Country</label>
                    <p className="text-sm">{profile.profileData.country}</p>
                  </div>
                  {profile.profileData.business_registration && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Business Registration</label>
                      <p className="text-sm">{profile.profileData.business_registration}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {profile.profileData.industry && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Industry</label>
                      <p className="text-sm">{profile.profileData.industry}</p>
                    </div>
                  )}
                  {profile.profileData.employees && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Employees</label>
                      <p className="text-sm">{profile.profileData.employees}</p>
                    </div>
                  )}
                  {profile.profileData.annual_revenue && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Annual Revenue</label>
                      <p className="text-sm">{profile.profileData.annual_revenue}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities">
          <Card>
            <CardHeader>
              <CardTitle>Matching Opportunities</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Funding opportunities matching your profile will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Your funding applications will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Profile activity history will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProfilePage;