import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { farms, farmDocuments } from '@/data/farms';
import { getRandomSubsidies, applications } from '@/data/subsidies';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StatusBadge from '@/components/StatusBadge';
import TagBadge from '@/components/TagBadge';
import { 
  CalendarDays, 
  FileText, 
  Info, 
  Upload, 
  Users, 
  Send, 
  Download,
  Percent,
  Clock,
  Globe,
  Hash,
  DollarSign,
  CheckCircle2,
  BarChart4
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FarmCardApplyButton from '@/components/FarmCardApplyButton';

const FarmProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Find farm data
  const farm = farms.find(f => f.id === id);
  if (!farm) return <div>Farm not found</div>;
  
  // Get farm documents
  const documents = farmDocuments[farm.id] || [];
  
  // Get random subsidies for this farm
  const farmSubsidies = getRandomSubsidies(farm.id);
  
  // Get applications for this farm
  const farmApplications = applications[farm.id] || [];

  // Handle assistant input
  const handleAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;
    
    // Simulate typing animation
    setIsTyping(true);
    setAssistantResponse('');
    
    // Simulate response after a delay
    setTimeout(() => {
      setAssistantResponse(t('farm.assistantResponse'));
      setIsTyping(false);
    }, 1500);
    
    // Clear input
    setAssistantInput('');
  };

  // Fake team members
  const teamMembers = [
    { id: 'user1', name: 'Maria Garcia' },
    { id: 'user2', name: 'Jean Dupont' },
    { id: 'user3', name: 'Ana Popescu' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{farm.name}</h1>
                <div className="flex items-center mt-2 gap-2">
                  <StatusBadge status={farm.status} />
                  <span className="text-sm text-gray-500">
                    <CalendarDays size={14} className="inline mr-1" />
                    {t('common.lastUpdated')}: {farm.updatedAt}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Select defaultValue="user1">
                          <SelectTrigger className="w-fit">
                            <Users size={16} className="mr-2" />
                            <span>{t('common.teamAccess')}</span>
                          </SelectTrigger>
                          <SelectContent>
                            {teamMembers.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manage team access for this farm</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-4">
              <TabsTrigger value="profile">{t('common.profile')}</TabsTrigger>
              <TabsTrigger value="documents">{t('common.documents')}</TabsTrigger>
              <TabsTrigger value="subsidies">{t('common.subsidies')}</TabsTrigger>
              <TabsTrigger value="applications">{t('common.applications')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile" className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('farm.profileTitle')}</CardTitle>
                    <CardDescription>{t('farm.profileSubtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <dl className="divide-y divide-gray-100">
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900 flex items-center">
                          Region
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info size={14} className="ml-1 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Administrative region where the farm is located</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.region}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900 flex items-center">
                          Size
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info size={14} className="ml-1 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Total area of the farm in hectares</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.size}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Staff</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.staff}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Revenue</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.revenue}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Certifications</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.certifications.join(', ')}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Activities</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.activities.join(', ')}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900 flex items-center">
                          Carbon Score
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info size={14} className="ml-1 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Measure of farm's carbon reduction practices (0-100)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          <div className="flex items-center gap-2">
                            <Progress value={farm.carbonScore} className="h-2 w-full max-w-xs" />
                            <span>{farm.carbonScore}/100</span>
                          </div>
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Irrigation Method</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.irrigationMethod}
                        </dd>
                      </div>
                      <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
                        <dt className="text-sm font-medium leading-6 text-gray-900">Software Used</dt>
                        <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                          {farm.software.join(', ')}
                        </dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>
                
                <div className="flex flex-col gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('farm.assistantTitle')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleAssistantSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Input
                            placeholder={t('farm.assistantPlaceholder')}
                            value={assistantInput}
                            onChange={(e) => setAssistantInput(e.target.value)}
                          />
                        </div>
                        
                        {(assistantResponse || isTyping) && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            {isTyping ? (
                              <div className="typing-animation w-full">
                                <span className="inline-block h-2 w-2 rounded-full bg-gray-500 mr-1"></span>
                                <span className="inline-block h-2 w-2 rounded-full bg-gray-500 mr-1"></span>
                                <span className="inline-block h-2 w-2 rounded-full bg-gray-500"></span>
                              </div>
                            ) : (
                              <div className="flex">
                                <div className="w-8 h-8 rounded-full bg-agri-green flex items-center justify-center mr-2 flex-shrink-0">
                                  <span className="text-white text-xs font-bold">A</span>
                                </div>
                                <p className="text-gray-700">{assistantResponse}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <Button type="submit">
                          <Send size={16} className="mr-2" />
                          Send
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle>Region Opportunity Score</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Grant Density</span>
                            <span className="font-medium">High</span>
                          </div>
                          <Progress value={85} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Political Friendliness</span>
                            <span className="font-medium">Medium</span>
                          </div>
                          <Progress value={68} className="h-2" />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Recent Approvals</span>
                            <span className="font-medium">Very High</span>
                          </div>
                          <Progress value={92} className="h-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="documents" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('farm.documentTitle')}</CardTitle>
                  <CardDescription>{t('farm.documentSubtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-end mb-4">
                    <Button>
                      <Upload size={16} className="mr-2" />
                      {t('common.upload')}
                    </Button>
                  </div>
                  
                  <div className="border rounded-md">
                    <div className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500 border-b grid grid-cols-12">
                      <div className="col-span-5">Name</div>
                      <div className="col-span-2">Type</div>
                      <div className="col-span-3">Tag</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    
                    {documents.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No documents found
                      </div>
                    ) : (
                      <div className="divide-y">
                        {documents.map((doc) => (
                          <div key={doc.id} className="px-4 py-3 text-sm grid grid-cols-12 items-center">
                            <div className="col-span-5 flex items-center">
                              <FileText size={16} className="mr-2 text-gray-400" />
                              {doc.name}
                            </div>
                            <div className="col-span-2">{doc.type}</div>
                            <div className="col-span-3">
                              <TagBadge tag={doc.tag} />
                            </div>
                            <div className="col-span-2 flex justify-end space-x-2">
                              <Button variant="ghost" size="icon">
                                <Download size={14} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="subsidies" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('subsidies.title')}</CardTitle>
                  <CardDescription>{t('subsidies.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {farmSubsidies.map((subsidy) => (
                      <Card key={subsidy.id} className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors">
                        <CardHeader className="bg-gray-50">
                          <CardTitle className="text-lg">{subsidy.name}</CardTitle>
                          <CardDescription>{subsidy.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex items-center">
                              <Percent size={16} className="mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700 mr-2">{t('subsidies.matchConfidence')}:</span>
                              <div className="flex items-center gap-2 ml-auto">
                                <Progress value={subsidy.matchConfidence} className="h-2 w-24" />
                                <span className="text-sm font-medium">{subsidy.matchConfidence}%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center">
                              <Clock size={16} className="mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700">{t('subsidies.deadline')}:</span>
                              <span className="text-sm font-medium ml-auto">{subsidy.deadline}</span>
                            </div>
                            
                            <div className="flex items-center">
                              <Globe size={16} className="mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700">{t('subsidies.regionEligibility')}:</span>
                              <span className="text-sm font-medium ml-auto">{subsidy.region}</span>
                            </div>
                            
                            <div className="flex items-center">
                              <Hash size={16} className="mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700">{t('subsidies.grantCode')}:</span>
                              <span className="text-sm font-medium ml-auto">{subsidy.code}</span>
                            </div>
                            
                            <div className="flex items-center">
                              <DollarSign size={16} className="mr-2 text-gray-500" />
                              <span className="text-sm text-gray-700">{t('subsidies.maxGrant')}:</span>
                              <span className="text-sm font-medium ml-auto">{subsidy.grant}</span>
                            </div>
                          </div>
                          
                          <div className="mt-4 flex justify-end">
                            <FarmCardApplyButton farmId={farm.id} subsidyId={subsidy.id}>
                              {t('common.applyNow')}
                            </FarmCardApplyButton>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="applications" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Application Dashboard</CardTitle>
                  <CardDescription>Track and manage your subsidy applications</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <div className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500 border-b grid grid-cols-12">
                      <div className="col-span-4">Subsidy Name</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Submitted</div>
                      <div className="col-span-2">Amount</div>
                      <div className="col-span-2 text-right">Actions</div>
                    </div>
                    
                    {farmApplications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No applications found
                      </div>
                    ) : (
                      <div className="divide-y">
                        {farmApplications.map((app) => (
                          <div key={app.id} className="px-4 py-3 text-sm grid grid-cols-12 items-center">
                            <div className="col-span-4">{app.subsidyName}</div>
                            <div className="col-span-2">
                              <StatusBadge status={app.status} />
                            </div>
                            <div className="col-span-2">{app.submittedDate}</div>
                            <div className="col-span-2">{app.grantAmount}</div>
                            <div className="col-span-2 flex justify-end space-x-2">
                              <Button size="sm" variant="outline">
                                {t('common.viewDetails')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {farmApplications.some(app => app.status === 'Approved') && (
                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 flex items-start">
                      <CheckCircle2 className="text-green-500 mr-3 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800">Approved Applications</h4>
                        <p className="text-sm text-green-700 mt-1">
                          {farmApplications.filter(app => app.status === 'Approved').length} of your applications have been approved. 
                          View the details to download acceptance certificates and fund allocation schedules.
                        </p>
                        <div className="mt-2">
                          <Button size="sm" variant="outline" className="bg-white">
                            <BarChart4 size={14} className="mr-2" />
                            Fund Allocation Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default FarmProfilePage;
