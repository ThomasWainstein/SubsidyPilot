import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, MapPin, Euro, FileText, AlertCircle, CheckCircle, Clock, Building, Phone, Mail, ExternalLink, Download, Heart, Share2, Check, X } from 'lucide-react';
import { useLanguage } from '@/contexts/language';
import { getLocalizedContent } from '@/utils/language';

interface DetailedSubsidyDisplayProps {
  subsidy: any;
  onBack?: () => void;
}

export const DetailedSubsidyDisplay: React.FC<DetailedSubsidyDisplayProps> = ({ 
  subsidy, 
  onBack 
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [isFavorited, setIsFavorited] = useState(false);

  // Extract data with proper formatting
  const formatArray = (data: any): string[] => {
    if (Array.isArray(data)) return data.filter(Boolean);
    if (typeof data === 'string') return data ? [data] : [];
    return [];
  };

  const formatAmount = (amount: any): string => {
    if (Array.isArray(amount) && amount.length > 0) {
      return amount.join(', ');
    }
    if (typeof amount === 'string') return amount;
    if (typeof amount === 'object' && amount !== null) {
      return JSON.stringify(amount);
    }
    return 'Amount not specified';
  };

  const safeString = (value: any): string => {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const categories = formatArray(subsidy.sectors || subsidy.categories);
  const objectives = formatArray(subsidy.objectives);
  const eligibleActions = formatArray(subsidy.eligible_actions);
  const ineligibleActions = formatArray(subsidy.ineligible_actions);
  const requiredDocuments = formatArray(subsidy.required_documents);
  const fundingRateDetails = formatArray(subsidy.funding_rate_details);

  // Get status based on available data
  const getStatus = () => {
    const deadline = subsidy.deadline || subsidy.application_deadline || subsidy.application_window_end;
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const now = new Date();
      return deadlineDate > now ? 'active' : 'expired';
    }
    return 'active'; // Default to active if no deadline info
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', icon: CheckCircle, text: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', icon: Clock, text: 'Pending' },
      expired: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', icon: AlertCircle, text: 'Expired' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-1" />
        {config.text}
      </span>
    );
  };

  const TabButton = ({ id, label, isActive, onClick }: { id: string; label: string; isActive: boolean; onClick: (id: string) => void }) => (
    <button
      onClick={() => onClick(id)}
      className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
        isActive 
          ? 'border-primary text-primary bg-primary/5' 
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {label}
    </button>
  );

  // Extract les-aides.fr API data if available
  const lesAidesData = (subsidy as any).raw_data?.fiche || null;
  const organisme = lesAidesData?.organisme || null;
  
  // Use les-aides.fr data if available, otherwise fallback to basic fields
  const title = lesAidesData?.nom || getLocalizedContent(subsidy.title, language) || 'Untitled Subsidy';
  const description = getLocalizedContent(subsidy.description, language) || '';
  const agency = organisme?.raison_sociale || organisme?.sigle || safeString(subsidy.agency || subsidy.issuing_body);
  const amount = formatAmount(subsidy.amount || subsidy.funding_amount);
  const deadline = subsidy.deadline || subsidy.application_deadline || subsidy.application_window_end;
  const region = safeString(subsidy.geographic_scope || subsidy.region || categories[0]);

  // Helper function to safely render HTML content
  const renderHTMLContent = (htmlContent: string) => {
    if (!htmlContent) return null;
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-ul:text-muted-foreground prose-ol:text-muted-foreground prose-li:text-muted-foreground" />;
  };

  // Extract funding amount from les-aides data if available
  const getFundingAmount = () => {
    // Debug logging to understand the data structure  
    console.log('=== FUNDING AMOUNT DEBUG (v2) ===');
    console.log('Subsidy data:', {
      raw_data: subsidy.raw_data,
      lesAidesData: lesAidesData,
      amount: subsidy.amount,
      amount_min: subsidy.amount_min,
      amount_max: subsidy.amount_max,
      funding_amount: subsidy.funding_amount
    });

    // First check if we have raw_data.fiche content (enhanced extraction data)
    if (subsidy.raw_data?.fiche) {
      const ficheText = typeof subsidy.raw_data.fiche === 'string' 
        ? subsidy.raw_data.fiche 
        : JSON.stringify(subsidy.raw_data.fiche);
      
      console.log('Processing fiche text:', ficheText.substring(0, 500));
      const cleanText = ficheText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Look for range patterns first (more specific)
      const rangePatterns = [
        /entre\s+(\d+(?:\s+\d+)*)\s*€\s+et\s+(\d+(?:\s+\d+)*)\s*€/i, // "entre 2 000 € et 50 000 €"
        /de\s+(\d+(?:\s+\d+)*)\s*€\s+à\s+(\d+(?:\s+\d+)*)\s*€/i, // "de 2 000 € à 50 000 €"
        /(\d+(?:\s+\d+)*)\s*€\s+à\s+(\d+(?:\s+\d+)*)\s*€/i, // "2 000 € à 50 000 €"
      ];
      
      for (const pattern of rangePatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          console.log('✅ FOUND RANGE:', match);
          const minAmount = parseInt(match[1].replace(/\s/g, '')).toLocaleString('fr-FR');
          const maxAmount = parseInt(match[2].replace(/\s/g, '')).toLocaleString('fr-FR');
          return `€${minAmount} - €${maxAmount}`;
        }
      }
      
      // Look for maximum amount patterns with clear client indicators
      const maxPatterns = [
        { pattern: /jusqu.à\s+(\d+(?:\s+\d+)*)\s*€/i, prefix: "< €", name: "jusqu'à" }, 
        { pattern: /(\d+(?:\s+\d+)*)\s*€\s+maximum/i, prefix: "< €", name: "maximum" },
        { pattern: /plafond\s+de\s+(\d+(?:\s+\d+)*)\s*€/i, prefix: "< €", name: "plafond" },
        { pattern: /plafonnée\s+à\s+(\d+(?:\s+\d+)*)\s*€/i, prefix: "< €", name: "plafonnée à" },
        { pattern: /maximum\s+de\s+(\d+(?:\s+\d+)*)\s*€/i, prefix: "< €", name: "maximum de" }
      ];
      
      for (const { pattern, prefix, name } of maxPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          console.log(`✅ FOUND MAXIMUM with pattern "${name}":`, match);
          const amount = parseInt(match[1].replace(/\s/g, '')).toLocaleString('fr-FR');
          return `${prefix}${amount}`;
        }
      }
      
      // Then check for exact amount patterns
      const exactPatterns = [
        { pattern: /valeur\s+de\s+(\d+(?:\s+\d+)*)\s*€/i, name: "valeur de" },
        { pattern: /aide\s+de\s+(\d+(?:\s+\d+)*)\s*€/i, name: "aide de" },
        { pattern: /(\d+(?:\s+\d+)*)\s*euros?\s+HT/i, name: "euros HT" },
        { pattern: /(\d+(?:\s+\d+)*)\s*€/i, name: "X €" }
      ];

      for (const { pattern, name } of exactPatterns) {
        const match = cleanText.match(pattern);
        if (match) {
          console.log(`✅ FOUND EXACT AMOUNT with pattern "${name}":`, match);
          const amount = parseInt(match[1].replace(/\s/g, '')).toLocaleString('fr-FR');
          return `€${amount}`;
        }
      }
      
      console.log('❌ No amount patterns matched in fiche data');
    }

    // Check lesAidesData montants field
    if (lesAidesData?.montants) {
      console.log('Processing lesAidesData.montants:', lesAidesData.montants);
      const montantsText = lesAidesData.montants.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Range patterns
      const rangeMatch = montantsText.match(/entre\s+(\d+(?:\s+\d+)*)\s*€\s+et\s+(\d+(?:\s+\d+)*)\s*€/i);
      if (rangeMatch) {
        console.log('✅ FOUND RANGE in montants:', rangeMatch);
        const minAmount = parseInt(rangeMatch[1].replace(/\s/g, '')).toLocaleString('fr-FR');
        const maxAmount = parseInt(rangeMatch[2].replace(/\s/g, '')).toLocaleString('fr-FR');
        return `€${minAmount} - €${maxAmount}`;
      }
      
      // Maximum patterns
      const maxMatch = montantsText.match(/jusqu.à\s+(\d+(?:\s+\d+)*)\s*€/i);
      if (maxMatch) {
        console.log('✅ FOUND MAXIMUM in montants:', maxMatch);
        const amount = parseInt(maxMatch[1].replace(/\s/g, '')).toLocaleString('fr-FR');
        return `< €${amount}`;
      }
    }

    // Check description as last resort
    if (subsidy.description) {
      console.log('Processing description:', subsidy.description.substring(0, 300));
      const descMatch = subsidy.description.match(/(\d+(?:\s+\d+)*)\s*€/);
      if (descMatch) {
        console.log('✅ FOUND AMOUNT in description:', descMatch);
        const amount = parseInt(descMatch[1].replace(/\s/g, '')).toLocaleString('fr-FR');
        return `€${amount}`;
      }
    }

    console.log('❌ NO AMOUNT FOUND IN ANY FIELD');
    
    // FALLBACK: Check standard numeric fields (from subsidies table) as last resort
    if (typeof subsidy.amount_min === 'number' && typeof subsidy.amount_max === 'number') {
      if (subsidy.amount_min === subsidy.amount_max) {
        // Fixed amount
        console.log('⚠️ FALLBACK TO FIXED AMOUNT:', subsidy.amount_min);
        return `€${subsidy.amount_min.toLocaleString('fr-FR')}`;
      } else {
        // Range
        console.log('⚠️ FALLBACK TO AMOUNT RANGE:', subsidy.amount_min, '-', subsidy.amount_max);
        return `€${subsidy.amount_min.toLocaleString('fr-FR')} - €${subsidy.amount_max.toLocaleString('fr-FR')}`;
      }
    }

    // Check individual numeric fields
    if (typeof subsidy.amount_min === 'number' && subsidy.amount_min > 0) {
      console.log('⚠️ FALLBACK TO MINIMUM AMOUNT:', subsidy.amount_min);
      return `< €${subsidy.amount_min.toLocaleString('fr-FR')}`;
    }

    if (typeof subsidy.amount_max === 'number' && subsidy.amount_max > 0) {
      console.log('⚠️ FALLBACK TO MAXIMUM AMOUNT:', subsidy.amount_max);
      return `< €${subsidy.amount_max.toLocaleString('fr-FR')}`;
    }
    
    return formatAmount(subsidy.amount || subsidy.funding_amount);
  };
  const getRegion = () => {
    // First check enhanced extraction data (raw_data.fiche)
    if (subsidy.raw_data?.fiche) {
      const ficheText = typeof subsidy.raw_data.fiche === 'string' 
        ? subsidy.raw_data.fiche 
        : JSON.stringify(subsidy.raw_data.fiche);
      
      const cleanText = ficheText.toLowerCase().replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Look for common French regions
      const regionPatterns = [
        { pattern: /hauts[-\s]de[-\s]france/i, name: 'Hauts-de-France' },
        { pattern: /île[-\s]de[-\s]france/i, name: 'Île-de-France' },
        { pattern: /nouvelle[-\s]aquitaine/i, name: 'Nouvelle-Aquitaine' },
        { pattern: /auvergne[-\s]rhône[-\s]alpes/i, name: 'Auvergne-Rhône-Alpes' },
        { pattern: /occitanie/i, name: 'Occitanie' },
        { pattern: /grand[-\s]est/i, name: 'Grand Est' },
        { pattern: /provence[-\s]alpes[-\s]côte.d.azur/i, name: 'Provence-Alpes-Côte d\'Azur' },
        { pattern: /bretagne/i, name: 'Bretagne' },
        { pattern: /normandie/i, name: 'Normandie' },
        { pattern: /centre[-\s]val.de.loire/i, name: 'Centre-Val de Loire' },
        { pattern: /bourgogne[-\s]franche[-\s]comté/i, name: 'Bourgogne-Franche-Comté' },
        { pattern: /pays.de.la.loire/i, name: 'Pays de la Loire' },
        { pattern: /corsica|corse/i, name: 'Corsica' },
        { pattern: /martinique/i, name: 'Martinique' },
        { pattern: /guadeloupe/i, name: 'Guadeloupe' },
        { pattern: /guyane/i, name: 'Guyane' },
        { pattern: /réunion/i, name: 'La Réunion' },
        { pattern: /mayotte/i, name: 'Mayotte' }
      ];
      
      for (const { pattern, name } of regionPatterns) {
        if (pattern.test(cleanText)) {
          return name;
        }
      }
      
      // Look for organization indicators
      if (cleanText.includes('conseil régional') || cleanText.includes('région')) {
        const regionMatch = cleanText.match(/(?:conseil\s+régional|région)\s+(?:de\s+)?([a-záàâäçéèêëïîôöùûüÿñ\s-]+)/i);
        if (regionMatch) {
          return regionMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    }
    
    // Check organisme data
    if (organisme?.raison_sociale) {
      const orgName = organisme.raison_sociale.toLowerCase();
      
      // Check for specific regions in organization name
      const regionPatterns = [
        { pattern: /hauts[-\s]de[-\s]france/i, name: 'Hauts-de-France' },
        { pattern: /île[-\s]de[-\s]france/i, name: 'Île-de-France' },
        { pattern: /nouvelle[-\s]aquitaine/i, name: 'Nouvelle-Aquitaine' },
        { pattern: /auvergne[-\s]rhône[-\s]alpes/i, name: 'Auvergne-Rhône-Alpes' },
        { pattern: /occitanie/i, name: 'Occitanie' },
        { pattern: /grand[-\s]est/i, name: 'Grand Est' },
        { pattern: /provence[-\s]alpes[-\s]côte.d.azur/i, name: 'Provence-Alpes-Côte d\'Azur' },
        { pattern: /bretagne/i, name: 'Bretagne' },
        { pattern: /normandie/i, name: 'Normandie' },
        { pattern: /centre[-\s]val.de.loire/i, name: 'Centre-Val de Loire' },
        { pattern: /bourgogne[-\s]franche[-\s]comté/i, name: 'Bourgogne-Franche-Comté' },
        { pattern: /pays.de.la.loire/i, name: 'Pays de la Loire' }
      ];
      
      for (const { pattern, name } of regionPatterns) {
        if (pattern.test(orgName)) {
          return name;
        }
      }
      
      if (orgName.includes('région')) {
        const regionMatch = orgName.match(/région\s+([^,]+)/);
        if (regionMatch) {
          return regionMatch[1].trim().replace(/\b\w/g, l => l.toUpperCase());
        }
      }
    }
    
    // Check if description mentions a region
    const descText = (lesAidesData?.objet || description || '').toLowerCase();
    const regionPatterns = [
      { pattern: /hauts[-\s]de[-\s]france/i, name: 'Hauts-de-France' },
      { pattern: /île[-\s]de[-\s]france/i, name: 'Île-de-France' },
      { pattern: /nouvelle[-\s]aquitaine/i, name: 'Nouvelle-Aquitaine' },
      { pattern: /occitanie/i, name: 'Occitanie' }
    ];
    
    for (const { pattern, name } of regionPatterns) {
      if (pattern.test(descText)) {
        return name;
      }
    }
    
    return safeString(subsidy.geographic_scope || subsidy.region || categories[0]);
  };

  // Extract category from les-aides domaines
  const getCategory = () => {
    if (lesAidesData?.domaines && lesAidesData.domaines.length > 0) {
      // Map domain IDs to readable categories (you might want to create a proper mapping)
      const domainId = lesAidesData.domaines[0];
      const domainMappings: { [key: number]: string } = {
        798: 'Commerce & Services',
        790: 'Industry & Production',
        802: 'Innovation & Technology',
        // Add more mappings as needed
      };
      return domainMappings[domainId] || 'Business Support';
    }
    return categories[0] || 'General';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              {onBack && (
                <button 
                  onClick={onBack}
                  className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back to Search
                </button>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setIsFavorited(!isFavorited)}
                className={`p-2 rounded-full transition-colors ${
                  isFavorited ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Heart className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
              <button className="p-2 bg-muted text-muted-foreground rounded-full hover:bg-muted/80 transition-colors">
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                {getStatusBadge(getStatus())}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-white/20 text-white">
                  <MapPin className="w-4 h-4 mr-1" />
                  {getRegion()}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
              <p className="text-xl text-primary-foreground/90 mb-4 max-w-3xl">{description || 'Detailed information about this subsidy program.'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:ml-8 md:min-w-[300px]">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{getFundingAmount()}</div>
                <div className="text-sm text-primary-foreground/80 mb-4">Maximum Amount</div>
                {deadline && (
                  <div className="flex items-center justify-center text-sm text-primary-foreground/80">
                    <Calendar className="w-4 h-4 mr-1" />
                    Deadline: {new Date(deadline).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <TabButton id="overview" label="Overview" isActive={activeTab === 'overview'} onClick={setActiveTab} />
            <TabButton id="eligibility" label="Eligibility" isActive={activeTab === 'eligibility'} onClick={setActiveTab} />
            <TabButton id="documents" label="Documents" isActive={activeTab === 'documents'} onClick={setActiveTab} />
            <TabButton id="contact" label="Contact" isActive={activeTab === 'contact'} onClick={setActiveTab} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Program Description */}
                <div className="bg-card rounded-lg shadow-sm border p-6">
                  <h2 className="text-2xl font-bold mb-4">Program Description</h2>
                  {lesAidesData?.objet ? (
                    renderHTMLContent(lesAidesData.objet)
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{description || 'This subsidy program provides financial support for eligible projects and activities.'}</p>
                  )}
                </div>

                {/* Funding Information */}
                <div className="bg-card rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold mb-4">Funding Information</h3>
                  {lesAidesData?.montants ? (
                    renderHTMLContent(lesAidesData.montants)
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-foreground mb-2">Amount</h4>
                        <p className="text-muted-foreground mb-3">{amount}</p>
                        {subsidy.minimum_investment && (
                          <p className="text-sm text-muted-foreground">
                            Minimum Investment: {safeString(subsidy.minimum_investment)}
                          </p>
                        )}
                      </div>
                      {fundingRateDetails.length > 0 && (
                        <div>
                          <h4 className="font-medium text-foreground mb-2">Funding Rates</h4>
                          <ul className="space-y-1">
                            {fundingRateDetails.map((rate, index) => (
                              <li key={index} className="text-muted-foreground text-sm">{rate}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Practical Information */}
                {lesAidesData?.conseils && (
                  <div className="bg-card rounded-lg shadow-sm border p-6">
                    <h3 className="text-xl font-semibold mb-4">Practical Information</h3>
                    {renderHTMLContent(lesAidesData.conseils)}
                  </div>
                )}

                {/* Objectives - only show if no les-aides data */}
                {!lesAidesData && objectives.length > 0 && (
                  <div className="bg-card rounded-lg shadow-sm border p-6">
                    <h3 className="text-xl font-semibold mb-4 flex items-center">
                      <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                      Program Objectives
                    </h3>
                    <ul className="space-y-3">
                      {objectives.map((objective, index) => (
                        <li key={index} className="flex items-start">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></div>
                          <span className="text-muted-foreground">{objective}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'eligibility' && (
              <div className="bg-card rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-6">Eligibility Criteria</h2>
                
                {/* Show les-aides.fr conditions if available */}
                {lesAidesData?.conditions && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-4">Conditions d'attribution</h3>
                    {renderHTMLContent(lesAidesData.conditions)}
                  </div>
                )}

                {/* Show eligibility criteria from les-aides.fr API */}
                {lesAidesData?.criteres?.pour && lesAidesData.criteres.pour.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">✓ Eligible Criteria</h3>
                    {lesAidesData.criteres.pour.map((critere: any, index: number) => (
                      <div key={index} className="flex items-start bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">{critere.libelle}</span>
                          {critere.enfants && critere.enfants.length > 0 && (
                            <ul className="mt-2 ml-4 space-y-1">
                              {critere.enfants.map((enfant: any, childIndex: number) => (
                                <li key={childIndex} className="text-sm text-muted-foreground">• {enfant.libelle}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show ineligible criteria from les-aides.fr API */}
                {lesAidesData?.criteres?.contre && lesAidesData.criteres.contre.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">✗ Ineligible Criteria</h3>
                    {lesAidesData.criteres.contre.map((critere: any, index: number) => (
                      <div key={index} className="flex items-start bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <X className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">{critere.libelle}</span>
                          {critere.enfants && critere.enfants.length > 0 && (
                            <ul className="mt-2 ml-4 space-y-1">
                              {critere.enfants.map((enfant: any, childIndex: number) => (
                                <li key={childIndex} className="text-sm text-muted-foreground">• {enfant.libelle}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Show restrictions from les-aides.fr API */}
                {lesAidesData?.restrictions && lesAidesData.restrictions.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">⚠️ Restrictions</h3>
                    {lesAidesData.restrictions.map((restriction: string, index: number) => (
                      <div key={index} className="flex items-start bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{restriction}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback to basic eligibility data if no les-aides data */}
                {!lesAidesData && (
                  <>
                    {eligibleActions.length > 0 ? (
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">✓ Eligible Activities</h3>
                        {eligibleActions.map((action, index) => (
                          <div key={index} className="flex items-start bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">Applications from qualified entities are welcome</span>
                        </div>
                        <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">Must meet program-specific requirements</span>
                        </div>
                        {subsidy.legal_entity_type && (
                          <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <CheckCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">Entity type: {safeString(subsidy.legal_entity_type)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {ineligibleActions.length > 0 && (
                      <div className="mt-6 space-y-4">
                        <h3 className="text-lg font-semibold text-red-700 dark:text-red-400">✗ Ineligible Activities</h3>
                        {ineligibleActions.map((action, index) => (
                          <div key={index} className="flex items-start bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                            <X className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="bg-card rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-6">Required Documents</h2>
                <div className="space-y-3">
                  {requiredDocuments.length > 0 ? (
                    requiredDocuments.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-primary mr-3" />
                          <span className="text-muted-foreground">{doc}</span>
                        </div>
                        <button className="text-primary hover:text-primary/80 transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-primary mr-3" />
                          <span className="text-muted-foreground">Application Form</span>
                        </div>
                        <button className="text-primary hover:text-primary/80 transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-primary mr-3" />
                          <span className="text-muted-foreground">Business Plan</span>
                        </div>
                        <button className="text-primary hover:text-primary/80 transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-primary mr-3" />
                          <span className="text-muted-foreground">Financial Statements</span>
                        </div>
                        <button className="text-primary hover:text-primary/80 transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="bg-card rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
                
                {/* Show les-aides.fr contact data if available */}
                {organisme && (
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <Building className="w-5 h-5 text-muted-foreground mr-3 mt-1" />
                      <div>
                        <div className="font-medium text-foreground">{organisme.raison_sociale}</div>
                        {organisme.sigle && (
                          <div className="text-muted-foreground">({organisme.sigle})</div>
                        )}
                      </div>
                    </div>

                    {/* Contact addresses from les-aides.fr API */}
                    {organisme.adresses && organisme.adresses.map((adresse: any, index: number) => (
                      <div key={index} className="border-l-4 border-primary/20 pl-4 bg-muted/30 p-4 rounded-r-lg">
                        {adresse.libelle && (
                          <h4 className="font-semibold text-foreground mb-2">{adresse.libelle}</h4>
                        )}
                        {adresse.service && (
                          <div className="text-sm text-muted-foreground mb-1">Service: {adresse.service}</div>
                        )}
                        {adresse.interlocuteur && (
                          <div className="text-sm text-muted-foreground mb-2">Contact: {adresse.interlocuteur}</div>
                        )}
                        
                        {adresse.adresse && (
                          <div className="flex items-start mb-2">
                            <MapPin className="w-4 h-4 text-muted-foreground mr-2 mt-1" />
                            <div className="text-sm text-muted-foreground whitespace-pre-line">{adresse.adresse}</div>
                          </div>
                        )}
                        
                        {adresse.telephone && (
                          <div className="flex items-center mb-2">
                            <Phone className="w-4 h-4 text-muted-foreground mr-2" />
                            <a href={`tel:${adresse.telephone}`} className="text-primary hover:text-primary/80 transition-colors text-sm">
                              {adresse.telephone}
                            </a>
                          </div>
                        )}
                        
                        {adresse.email && (
                          <div className="flex items-center mb-2">
                            <Mail className="w-4 h-4 text-muted-foreground mr-2" />
                            <a href={`mailto:${adresse.email}`} className="text-primary hover:text-primary/80 transition-colors text-sm">
                              {adresse.email}
                            </a>
                          </div>
                        )}
                        
                        {adresse.web && (
                          <div className="flex items-center">
                            <ExternalLink className="w-4 h-4 text-muted-foreground mr-2" />
                            <a href={adresse.web} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors text-sm">
                              Visit Website
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Fallback to basic contact data if no les-aides data */}
                {!organisme && (
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Building className="w-5 h-5 text-muted-foreground mr-3 mt-1" />
                      <div>
                        <div className="font-medium text-foreground">{agency}</div>
                        {subsidy.program && (
                          <div className="text-muted-foreground">{safeString(subsidy.program)}</div>
                        )}
                      </div>
                    </div>
                    
                    {subsidy.contact_phone && (
                      <div className="flex items-center">
                        <Phone className="w-5 h-5 text-muted-foreground mr-3" />
                        <a href={`tel:${subsidy.contact_phone}`} className="text-primary hover:text-primary/80 transition-colors">
                          {subsidy.contact_phone}
                        </a>
                      </div>
                    )}
                    
                    {subsidy.contact_email && (
                      <div className="flex items-center">
                        <Mail className="w-5 h-5 text-muted-foreground mr-3" />
                        <a href={`mailto:${subsidy.contact_email}`} className="text-primary hover:text-primary/80 transition-colors">
                          {subsidy.contact_email}
                        </a>
                      </div>
                    )}

                    {subsidy.url && (
                      <div className="flex items-center">
                        <ExternalLink className="w-5 h-5 text-muted-foreground mr-3" />
                        <a href={subsidy.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
                          Visit Official Page
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-card rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Button className="w-full">
                  Apply Now
                </Button>
                <Button variant="outline" className="w-full">
                  Download Guide
                </Button>
                <Button variant="outline" className="w-full">
                  Check Eligibility
                </Button>
              </div>
            </div>

            {/* Key Information */}
            <div className="bg-card rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Key Information</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground">Maximum Amount</div>
                  <div className="font-semibold text-lg">{getFundingAmount()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Region</div>
                  <div className="font-medium">{getRegion()}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div className="font-medium">{getCategory()}</div>
                </div>
                {deadline && (
                  <div>
                    <div className="text-sm text-muted-foreground">Deadline</div>
                    <div className="font-medium">{new Date(deadline).toLocaleDateString()}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Related Subsidies */}
            <div className="bg-card rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Related Programs</h3>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="font-medium text-sm">Innovation Support Program</div>
                  <div className="text-xs text-muted-foreground">Up to €90,000</div>
                </div>
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="font-medium text-sm">Regional Development Aid</div>
                  <div className="text-xs text-muted-foreground">Up to €25,000</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};