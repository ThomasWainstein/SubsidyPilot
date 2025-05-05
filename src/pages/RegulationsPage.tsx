
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import Navbar from '@/components/Navbar';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const RegulationsPage = () => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [currentSuggestion, setCurrentSuggestion] = useState(0);

  const suggestedQueries = [
    "What nitrate limits apply to maize in Occitanie?",
    "Is solar-compatible land eligible under the French zoning law?",
    "Which CAP rules apply to irrigation in Natura 2000 areas?",
  ];

  const regulationCards = [
    {
      title: "Sustainability & Climate Compliance",
      lastUpdated: "April 2025",
      includes: "Climate Delegated Act, Environmental Delegated Act, EU 2023 Amendments",
      type: "EU Regulation",
      examples: [
        "Is agro-PV covered under Article 10 of the Climate Delegated Act?",
        "Can a greenhouse be classified as environmentally sustainable?"
      ]
    },
    {
      title: "Nitrates & Water Management",
      lastUpdated: "March 2025",
      includes: "Nitrates Directive (91/676/EEC), SDAGE frameworks",
      type: "EU + France Regional",
      examples: [
        "What is the nitrate threshold for Charente-Maritime?",
        "Do SDAGE updates affect cereal crop rotations?"
      ]
    },
    {
      title: "Land Use & Zoning",
      lastUpdated: "February 2025",
      includes: "PLU zoning rules, SAFER land eligibility, LULUCF guidance",
      type: "France",
      examples: [
        "Can I install solar on arable land near Toulouse?",
        "What zoning limits apply to converting forest parcels?"
      ]
    },
    {
      title: "Pesticide & Input Restrictions",
      lastUpdated: "January 2025",
      includes: "Directive 2009/128/EC, Ecophyto 2030 Plan",
      type: "EU + France",
      examples: [
        "What buffer zone is needed for glyphosate use near rivers?",
        "Can I use neonicotinoids on rapeseed in 2025?"
      ]
    },
    {
      title: "Biodiversity & Natural Areas",
      lastUpdated: "March 2025",
      includes: "Natura 2000, ZNIEFF, French Biodiversity Code",
      type: "EU + France",
      examples: [
        "Are hedgerows protected under ZNIEFF?",
        "Can a CAP subsidy be received in Natura 2000 zones?"
      ]
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSuggestion((prev) => (prev + 1) % suggestedQueries.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResponse(null);
    
    // Simulating AI response with timeout
    setTimeout(() => {
      let simulatedResponse = "";
      
      if (query.toLowerCase().includes("nitrate")) {
        simulatedResponse = "Under the Nitrates Directive (91/676/EEC), the limit for nitrate concentration in vulnerable zones of Nouvelle-Aquitaine is 50mg/L. Regional SDAGE frameworks may apply stricter limits. See Article 5(4) of the Directive for implementation guidelines.";
      } else if (query.toLowerCase().includes("solar") || query.toLowerCase().includes("pv")) {
        simulatedResponse = "Under Article 10(1) of the Climate Delegated Act (2021/2139), solar-integrated agricultural structures may qualify as environmentally sustainable investments, if aligned with technical screening criteria. French PLU zoning requires specific permits for dual-use installations.";
      } else if (query.toLowerCase().includes("cap")) {
        simulatedResponse = "CAP eco-schemes provide enhanced support for farms in Natura 2000 areas that implement water-saving irrigation methods. Regulation EU 2021/2115 Article 31(7)(b) specifies eligibility criteria. Regional implementation may vary.";
      } else {
        simulatedResponse = "Based on the current agricultural regulations, your query relates to multiple frameworks. Please refer to Directive 2020/2115 for general guidance, or specify the region and exact regulatory domain for more precise information.";
      }
      
      setResponse(simulatedResponse);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    handleSubmit(new Event('submit') as any);
  };

  const getBadgeColor = (type: string) => {
    if (type.includes("EU")) return "bg-blue-100 text-blue-800";
    if (type.includes("France")) return "bg-purple-100 text-purple-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow py-6 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="container mx-auto">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink as={Link} to="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink as={Link} to="/regulations">Regulations</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          
          <div className="max-w-4xl mx-auto mt-6">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Agricultural Regulations Assistant</h1>
              <p className="text-gray-600">Ask any question about EU, national, or regional agricultural regulations</p>
            </div>
            
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="relative">
                <div className="flex">
                  <div className="relative flex-grow">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={`Ask something like '${suggestedQueries[currentSuggestion]}'`}
                      className="pl-10 pr-4 py-6 text-lg shadow-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    {!query && (
                      <span className="absolute left-10 top-1/2 transform -translate-y-1/2 h-5 w-0.5 bg-gray-400 animate-pulse"></span>
                    )}
                  </div>
                  <Button type="submit" className="ml-2 py-6" disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin" /> : "Ask"}
                  </Button>
                </div>
              </div>
            </form>
            
            {!response && !isLoading && (
              <div className="flex flex-wrap justify-center gap-2 mb-8">
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
            
            {isLoading && (
              <div className="bg-white p-6 rounded-lg shadow-md mb-8 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>
            )}
            
            {response && (
              <div className="bg-white p-6 rounded-lg shadow-md mb-8 animate-fade-in">
                <p className="text-gray-800">{response}</p>
              </div>
            )}
            
            <div className="mt-12 mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Explore Regulations by Category</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {regulationCards.map((card, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle>{card.title}</CardTitle>
                        <Badge className={getBadgeColor(card.type)}>{card.type}</Badge>
                      </div>
                      <CardDescription className="text-sm text-gray-500">
                        Last Updated: {card.lastUpdated}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700 mb-3">Includes: {card.includes}</p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Example Questions:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {card.examples.map((example, i) => (
                            <li key={i} className="text-sm text-gray-600">
                              <button
                                onClick={() => handleSuggestionClick(example)}
                                className="text-left hover:text-purple-700 transition-colors"
                              >
                                {example}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RegulationsPage;
