
import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Search, Loader2, MessageSquare, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TagBadge from '@/components/TagBadge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

type ViewMode = 'split' | 'notifications' | 'chat';

const RegulationsPage = () => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', content: string, citation?: string}[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  const suggestedQueries = [
    "Can I use glyphosate in 2025?",
    "Which zones allow agro-PV?",
    "What nitrate limits apply in Occitanie?",
  ];

  const regulationNotifications = [
    {
      title: "SDAGE Nouvelle-Aquitaine Revised",
      region: "France – Regional",
      date: "April 2025",
      summary: "Tighter nitrate thresholds for maize and vineyards",
      link: "https://www.nouvelle-aquitaine.developpement-durable.gouv.fr/sdage-et-programmes-d-actions-a3200.html"
    },
    {
      title: "CAP 2025 Screening Finalized",
      region: "EU",
      date: "March 2025",
      summary: "Greenhouse funding conditions adjusted",
      link: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R2115"
    },
    {
      title: "Zoning Law – PLU Solar Access Expanded",
      region: "France – Local",
      date: "February 2025",
      summary: "Agro-PV now allowed on Class B lands in 37 communes",
      link: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006074075"
    }
  ];

  const demoConversation = [
    { 
      role: 'user' as const, 
      content: "Is agro-PV allowed on grazing land in Nouvelle-Aquitaine?"
    },
    { 
      role: 'ai' as const, 
      content: "Yes, under Article 10 of the EU Climate Delegated Act (2021/2139), if dual use is maintained and zoning permits apply.",
      citation: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021R2139"
    },
    { 
      role: 'user' as const, 
      content: "Does the PLU allow solar installations on pasture?"
    },
    { 
      role: 'ai' as const, 
      content: "In many communes, yes under zone A with conditional use. Confirm with your mairie or PLU regulations.",
      citation: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006074075"
    },
    { 
      role: 'user' as const, 
      content: "Is SAFER involved in this?"
    },
    { 
      role: 'ai' as const, 
      content: "Yes, agro-PV requires SAFER notification if land use changes or leases are affected.",
      citation: "https://www.saferna.fr/"
    },
    { 
      role: 'user' as const, 
      content: "Do I need an environmental impact study?"
    },
    { 
      role: 'ai' as const, 
      content: "Likely, per Article R122-2 of the Environmental Code, especially over 250kW or near sensitive zones.",
      citation: "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000006183120"
    }
  ];
  
  // Setup auto-rotating suggestion and demo chat if right side is selected
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSuggestion((prev) => (prev + 1) % suggestedQueries.length);
    }, 5000);

    // If we're in chat mode, initialize the demo conversation
    if (viewMode === 'chat' && chatMessages.length === 0) {
      let messageIndex = 0;
      const messageInterval = setInterval(() => {
        if (messageIndex < demoConversation.length) {
          setChatMessages(prev => [...prev, demoConversation[messageIndex]]);
          messageIndex++;
        } else {
          clearInterval(messageInterval);
        }
      }, 2000);
    }

    return () => {
      clearInterval(interval);
    };
  }, [viewMode]);

  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleResetView = () => {
    setViewMode('split');
  };

  const handleExpandNotifications = () => {
    setViewMode('notifications');
  };

  const handleExpandChat = () => {
    setViewMode('chat');
    // Initialize demo chat if not already started
    if (chatMessages.length === 0) {
      setChatMessages([demoConversation[0], demoConversation[1]]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Add user message to chat
    setChatMessages(prev => [...prev, { role: 'user', content: query }]);
    
    setIsLoading(true);
    
    // Simulate AI response with timeout
    setTimeout(() => {
      let simulatedResponse = "";
      let citation = "";
      
      if (query.toLowerCase().includes("nitrate")) {
        simulatedResponse = "Under the Nitrates Directive (91/676/EEC), the limit for nitrate concentration in vulnerable zones of Nouvelle-Aquitaine is 50mg/L. Regional SDAGE frameworks may apply stricter limits.";
        citation = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:31991L0676";
      } else if (query.toLowerCase().includes("solar") || query.toLowerCase().includes("pv")) {
        simulatedResponse = "Under Article 10(1) of the Climate Delegated Act (2021/2139), solar-integrated agricultural structures may qualify as environmentally sustainable investments, if aligned with technical screening criteria. French PLU zoning requires specific permits for dual-use installations.";
        citation = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021R2139";
      } else if (query.toLowerCase().includes("cap")) {
        simulatedResponse = "CAP eco-schemes provide enhanced support for farms in Natura 2000 areas that implement water-saving irrigation methods. Regulation EU 2021/2115 Article 31(7)(b) specifies eligibility criteria. Regional implementation may vary.";
        citation = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R2115";
      } else {
        simulatedResponse = "Based on the current agricultural regulations, your query relates to multiple frameworks. Please refer to Directive 2020/2115 for general guidance, or specify the region and exact regulatory domain for more precise information.";
        citation = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R2115";
      }
      
      // Add AI response to chat
      setChatMessages(prev => [...prev, { role: 'ai', content: simulatedResponse, citation }]);
      
      setIsLoading(false);
      setQuery(''); // Clear input after sending
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    // Expand chat view when suggestion is clicked
    setViewMode('chat');
    handleSubmit(new Event('submit') as any);
  };

  const getRegionBadgeColor = (region: string) => {
    if (region.includes("EU")) return "bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100";
    if (region.includes("France – Regional")) return "bg-indigo-100 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-100";
    if (region.includes("France – Local")) return "bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100";
    if (region.includes("France")) return "bg-violet-100 text-violet-800 dark:bg-violet-800 dark:text-violet-100";
    return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/regulations">Regulations</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          {viewMode !== 'split' && (
            <Button 
              variant="ghost" 
              onClick={handleResetView} 
              className="mb-6 flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Overview
            </Button>
          )}
          
          <div className={`transition-all duration-500 ease-in-out ${viewMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-2 gap-8' : 'grid grid-cols-1'}`}>
            {/* Left Side - Regulation Notifications */}
            {viewMode === 'split' || viewMode === 'notifications' ? (
              <div className={`space-y-6 ${viewMode === 'split' ? 'order-2 lg:order-1' : ''}`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Latest Regulation Updates</h2>
                  {viewMode === 'split' && (
                    <Button variant="ghost" size="sm" onClick={handleExpandNotifications}>
                      Expand <ChevronRight size={16} />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {regulationNotifications.map((notification, index) => (
                    <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow duration-300 cursor-pointer" onClick={() => window.open(notification.link, '_blank')}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{notification.title}</CardTitle>
                          <Badge className={getRegionBadgeColor(notification.region)}>{notification.region}</Badge>
                        </div>
                        <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                          {notification.date}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">{notification.summary}</p>
                      </CardContent>
                      <CardFooter className="pt-0 pb-4">
                        <Button variant="outline" size="sm" className="text-xs" onClick={(e) => {
                          e.stopPropagation();
                          window.open(notification.link, '_blank');
                        }}>
                          View Regulation
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </div>
            ) : null}
            
            {/* Right Side - AI Chat */}
            {viewMode === 'split' || viewMode === 'chat' ? (
              <div className={`space-y-6 ${viewMode === 'split' ? 'order-1 lg:order-2' : ''}`}>
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                    <MessageSquare className="mr-2" size={24} />
                    Regulation Assistant
                  </h2>
                  {viewMode === 'split' && (
                    <Button variant="ghost" size="sm" onClick={handleExpandChat}>
                      Expand <ChevronRight size={16} />
                    </Button>
                  )}
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 min-h-[400px] flex flex-col">
                  <div className="flex-grow overflow-auto mb-4 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6">
                        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Regulations Assistant</h3>
                        <p className="text-gray-500 dark:text-gray-400">Ask any question about EU, national, or regional agricultural regulations.</p>
                      </div>
                    ) : (
                      <>
                        {chatMessages.map((message, index) => (
                          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100' 
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                            }`}>
                              <p>{message.content}</p>
                              {message.citation && (
                                <a 
                                  href={message.citation} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-600 dark:text-blue-400 text-xs underline mt-1 block"
                                >
                                  View Source
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                        {isLoading && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg flex items-center">
                              <Loader2 className="animate-spin h-4 w-4 mr-2" />
                              <span>Consulting regulations...</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="relative">
                      <div className="flex">
                        <div className="relative flex-grow">
                          <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={`Ask something like '${suggestedQueries[currentSuggestion]}'`}
                            className="pl-10 pr-4 py-5 text-base shadow-md focus:ring-2 focus:ring-purple-500 focus:border-transparent rounded-full"
                            onClick={() => setViewMode('chat')}
                          />
                          <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                          {!query && (
                            <span className="absolute left-10 top-1/2 transform -translate-y-1/2 h-5 w-0.5 bg-gray-400 animate-pulse"></span>
                          )}
                        </div>
                        <Button type="submit" className="ml-2 rounded-full" disabled={isLoading}>
                          {isLoading ? <Loader2 className="animate-spin" /> : "Ask"}
                        </Button>
                      </div>
                    </div>
                    
                    {chatMessages.length === 0 && (
                      <div className="flex flex-wrap justify-center gap-2">
                        {suggestedQueries.map((suggestion, index) => (
                          <Button 
                            key={index} 
                            variant="outline" 
                            onClick={() => handleSuggestionClick(suggestion)}
                            className={`text-sm ${index === currentSuggestion ? 'border-purple-400' : ''}`}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegulationsPage;
