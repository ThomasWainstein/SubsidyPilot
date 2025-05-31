
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import { Upload } from 'lucide-react';

const AuthScreen = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    userType: '',
    companyName: '',
    cui: '',
    organizationName: '',
    legalForm: ''
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.email && loginData.password) {
      toast({
        title: t('common.success'),
        description: 'Login successful',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: t('common.error'),
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: t('common.error'),
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }
    
    if (registerData.name && registerData.email && registerData.password && registerData.userType) {
      toast({
        title: t('common.success'),
        description: 'Registration successful',
      });
      navigate('/dashboard');
    } else {
      toast({
        title: t('common.error'),
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: t('common.success'),
        description: `File ${file.name} uploaded successfully`,
      });
    }
  };

  const renderConditionalFields = () => {
    if (registerData.userType === 'consultant') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              type="text"
              placeholder="Enter company name"
              value={registerData.companyName}
              onChange={(e) => setRegisterData({ ...registerData, companyName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cui">CUI (Company Registration Number)</Label>
            <Input
              id="cui"
              type="text"
              placeholder="Enter CUI"
              value={registerData.cui}
              onChange={(e) => setRegisterData({ ...registerData, cui: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-cert">Company Registration Certificate</Label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="company-cert" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> company certificate
                  </p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                </div>
                <input id="company-cert" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </>
      );
    }

    if (registerData.userType === 'organization') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              type="text"
              placeholder="Enter organization name"
              value={registerData.organizationName}
              onChange={(e) => setRegisterData({ ...registerData, organizationName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legal-form">Legal Form</Label>
            <Select onValueChange={(value) => setRegisterData({ ...registerData, legalForm: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select legal form" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="srl">SRL</SelectItem>
                <SelectItem value="cooperative">Cooperative</SelectItem>
                <SelectItem value="ngo">NGO</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-cert">Organization Registration Certificate</Label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="org-cert" className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">Click to upload</span> organization certificate
                  </p>
                  <p className="text-xs text-gray-500">PDF files only</p>
                </div>
                <input id="org-cert" type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Welcome to AgriTool
          </h2>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Access Your Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Login
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Full Name</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email Address</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm">Confirm Password</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="Confirm your password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="user-type">User Type</Label>
                    <Select onValueChange={(value) => setRegisterData({ ...registerData, userType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farmer">Farmer</SelectItem>
                        <SelectItem value="consultant">Independent Consultant / Contractor</SelectItem>
                        <SelectItem value="organization">Team / Organization</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {renderConditionalFields()}
                  
                  <Button type="submit" className="w-full">
                    Register
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="mt-12">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-1">Digital Farm Profiles</h3>
              <p className="text-xs text-gray-600">Comprehensive digital profiles for all your farms</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-1">Subsidy Matching</h3>
              <p className="text-xs text-gray-600">AI-powered matching with available subsidies</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold mb-1">Application Tracking</h3>
              <p className="text-xs text-gray-600">Track and manage subsidy applications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
