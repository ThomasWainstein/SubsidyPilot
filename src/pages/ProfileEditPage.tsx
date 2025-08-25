import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ApplicantType } from "@/components/profile/ApplicantTypeSelector";

// Mock profile data - replace with actual API calls
const mockProfile = {
  id: '1',
  profileName: 'Green Tech Solutions Ltd.',
  applicantType: 'business' as ApplicantType,
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
  }
};

const ProfileEditPage = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState(mockProfile);
  const [formData, setFormData] = useState({
    profileName: mockProfile.profileName,
    address: mockProfile.profileData.address,
    country: mockProfile.profileData.country,
    phone: mockProfile.profileData.contact_info?.phone || '',
    email: mockProfile.profileData.contact_info?.email || '',
    businessRegistration: mockProfile.profileData.business_registration || '',
    industry: mockProfile.profileData.industry || '',
    employees: mockProfile.profileData.employees || '',
    annualRevenue: mockProfile.profileData.annual_revenue || ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // TODO: Load actual profile data
    console.log('Loading profile:', profileId);
  }, [profileId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call to update profile
      console.log('Updating profile:', formData);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      
      navigate(`/profile/${profileId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(`/profile/${profileId}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your profile information
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="profileName">Profile Name *</Label>
            <Input
              id="profileName"
              value={formData.profileName}
              onChange={(e) => handleInputChange('profileName', e.target.value)}
              placeholder="Enter profile name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter full address"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          {profile.applicantType === 'business' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="businessRegistration">Business Registration</Label>
                <Input
                  id="businessRegistration"
                  value={formData.businessRegistration}
                  onChange={(e) => handleInputChange('businessRegistration', e.target.value)}
                  placeholder="Enter business registration number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  placeholder="Enter industry"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employees">Number of Employees</Label>
                  <Input
                    id="employees"
                    value={formData.employees}
                    onChange={(e) => handleInputChange('employees', e.target.value)}
                    placeholder="e.g., 25-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annualRevenue">Annual Revenue</Label>
                  <Input
                    id="annualRevenue"
                    value={formData.annualRevenue}
                    onChange={(e) => handleInputChange('annualRevenue', e.target.value)}
                    placeholder="e.g., €2-5M"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/profile/${profileId}`)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading || !formData.profileName.trim()}
              className="gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileEditPage;