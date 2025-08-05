import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Rocket, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Activity,
  Shield,
  Zap,
  Database,
  Users,
  Globe,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface LaunchReadinessData {
  success: boolean;
  launch_ready: boolean;
  readiness_checks: {
    technical_readiness: boolean;
    data_readiness: boolean;
    user_experience_readiness: boolean;
    business_readiness: boolean;
    operational_readiness: boolean;
    overall_ready: boolean;
  };
  readiness_score: number;
  blockers: string[];
  warnings: string[];
  recommendation: string;
}

interface ValidationResult {
  success: boolean;
  test_results?: any;
  performance_results?: any;
  security_checks?: any;
  deployment_checks?: any;
  readiness_score?: number;
  issues?: string[];
  vulnerabilities?: string[];
  blockers?: string[];
  warnings?: string[];
  recommendation: string;
}

export const LaunchReadinessCenter: React.FC = () => {
  const [launchData, setLaunchData] = useState<LaunchReadinessData | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkLaunchReadiness();
  }, []);

  const checkLaunchReadiness = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('launch-validator', {
        body: { action: 'launch_readiness' }
      });

      if (error) throw error;
      setLaunchData(data);
    } catch (error) {
      toast({
        title: "Error Checking Launch Readiness",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runValidation = async (testType: string) => {
    setActiveTest(testType);
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('launch-validator', {
        body: { 
          action: testType,
          config: {
            test_countries: ['romania', 'france'],
            performance_targets: {
              max_api_response: 3000,
              max_db_query: 1000,
              max_form_generation: 10000
            }
          }
        }
      });

      if (error) throw error;
      
      setValidationResults(prev => ({
        ...prev,
        [testType]: data
      }));

      toast({
        title: "Validation Complete",
        description: `${testType.replace('_', ' ')} validation completed`,
        variant: data.success ? "default" : "destructive"
      });

      // Refresh launch readiness after each test
      checkLaunchReadiness();
    } catch (error) {
      toast({
        title: "Validation Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setActiveTest(null);
    }
  };

  const getReadinessIcon = (ready: boolean) => {
    return ready ? 
      <CheckCircle className="h-5 w-5 text-green-600" /> : 
      <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getValidationIcon = (testType: string) => {
    switch (testType) {
      case 'full_system_test': return <Activity className="h-4 w-4" />;
      case 'performance_test': return <Zap className="h-4 w-4" />;
      case 'security_audit': return <Shield className="h-4 w-4" />;
      case 'deploy_validation': return <Database className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Launch Readiness Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Rocket className="h-6 w-6" />
            AgriTool Launch Readiness Center
          </CardTitle>
        </CardHeader>
        <CardContent>
          {launchData ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {launchData.launch_ready ? (
                    <>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-green-600">
                          🚀 READY FOR LAUNCH!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          All systems validated and ready for production
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-8 w-8 text-yellow-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-600">
                          ⚠️ Pre-Launch Validation Needed
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Address issues before launch
                        </p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getScoreColor(launchData.readiness_score)}`}>
                    {Math.round(launchData.readiness_score * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Ready</div>
                </div>
              </div>

              <Progress value={launchData.readiness_score * 100} className="h-2" />

              {launchData.blockers.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Launch Blockers:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {launchData.blockers.map((blocker, index) => (
                        <li key={index}>{blocker}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {launchData.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="mt-1 ml-4 list-disc">
                      {launchData.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Checking launch readiness...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness Components */}
      {launchData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Technical Readiness</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getReadinessIcon(launchData.readiness_checks.technical_readiness)}
                <span className="font-medium">
                  {launchData.readiness_checks.technical_readiness ? 'Ready' : 'Issues'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Data Readiness</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getReadinessIcon(launchData.readiness_checks.data_readiness)}
                <span className="font-medium">
                  {launchData.readiness_checks.data_readiness ? 'Ready' : 'Insufficient'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Experience</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getReadinessIcon(launchData.readiness_checks.user_experience_readiness)}
                <span className="font-medium">
                  {launchData.readiness_checks.user_experience_readiness ? 'Ready' : 'Issues'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Business Readiness</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getReadinessIcon(launchData.readiness_checks.business_readiness)}
                <span className="font-medium">
                  {launchData.readiness_checks.business_readiness ? 'Ready' : 'Issues'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operational</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {getReadinessIcon(launchData.readiness_checks.operational_readiness)}
                <span className="font-medium">
                  {launchData.readiness_checks.operational_readiness ? 'Ready' : 'Issues'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Validation Tests */}
      <Tabs defaultValue="validation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="validation">Validation Tests</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="launch">Launch Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="validation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pre-Launch Validation Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => runValidation('full_system_test')}
                  disabled={isLoading}
                  className="flex items-center gap-2 h-auto p-4 flex-col"
                  variant={validationResults.full_system_test?.success ? "default" : "outline"}
                >
                  <Activity className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Full System Test</div>
                    <div className="text-xs opacity-75">End-to-end validation</div>
                  </div>
                  {activeTest === 'full_system_test' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                </Button>

                <Button
                  onClick={() => runValidation('performance_test')}
                  disabled={isLoading}
                  className="flex items-center gap-2 h-auto p-4 flex-col"
                  variant={validationResults.performance_test?.success ? "default" : "outline"}
                >
                  <Zap className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Performance Test</div>
                    <div className="text-xs opacity-75">Speed & scalability</div>
                  </div>
                  {activeTest === 'performance_test' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                </Button>

                <Button
                  onClick={() => runValidation('security_audit')}
                  disabled={isLoading}
                  className="flex items-center gap-2 h-auto p-4 flex-col"
                  variant={validationResults.security_audit?.success ? "default" : "outline"}
                >
                  <Shield className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Security Audit</div>
                    <div className="text-xs opacity-75">Security validation</div>
                  </div>
                  {activeTest === 'security_audit' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                </Button>

                <Button
                  onClick={() => runValidation('deploy_validation')}
                  disabled={isLoading}
                  className="flex items-center gap-2 h-auto p-4 flex-col"
                  variant={validationResults.deploy_validation?.success ? "default" : "outline"}
                >
                  <Database className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">Deploy Validation</div>
                    <div className="text-xs opacity-75">Deployment readiness</div>
                  </div>
                  {activeTest === 'deploy_validation' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Validation Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(validationResults).map(([testType, result]) => (
                  <div key={testType} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getValidationIcon(testType)}
                        <span className="font-medium capitalize">
                          {testType.replace('_', ' ')}
                        </span>
                      </div>
                      <Badge variant={result.success ? "default" : "destructive"}>
                        {result.success ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                    
                    {result.readiness_score && (
                      <div className="mb-2">
                        <Progress value={result.readiness_score * 100} className="h-2" />
                        <div className="text-sm text-muted-foreground mt-1">
                          Score: {Math.round(result.readiness_score * 100)}%
                        </div>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground">
                      {result.recommendation}
                    </div>
                    
                    {(result.issues || result.vulnerabilities || result.blockers)?.length > 0 && (
                      <div className="mt-2 text-sm">
                        <strong>Issues:</strong>
                        <ul className="mt-1 ml-4 list-disc">
                          {[...(result.issues || []), ...(result.vulnerabilities || []), ...(result.blockers || [])].map((issue, index) => (
                            <li key={index}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

                {Object.keys(validationResults).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No validation results yet. Run tests to see results.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="launch" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Launch Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {launchData?.launch_ready ? (
                  <Alert>
                    <Rocket className="h-4 w-4" />
                    <AlertDescription>
                      <strong>🚀 Ready for Launch!</strong><br />
                      All systems validated and ready for production deployment.
                      The AgriTool dual pipeline system can now serve European farmers.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Launch Blocked</strong><br />
                      Address the issues above before proceeding with launch.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button 
                    onClick={checkLaunchReadiness}
                    disabled={isLoading}
                    variant="outline"
                  >
                    Refresh Status
                  </Button>
                  
                  {launchData?.launch_ready && (
                    <Button className="flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      Initiate Launch Sequence
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};