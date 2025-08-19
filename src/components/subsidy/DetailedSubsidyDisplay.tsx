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
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} className="prose prose-sm max-w-none dark:prose-invert" />;
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
                  {region}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">{title}</h1>
              <p className="text-xl text-primary-foreground/90 mb-4 max-w-3xl">{description || 'Detailed information about this subsidy program.'}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 md:ml-8 md:min-w-[300px]">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">{amount}</div>
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
                  <div className="font-semibold text-lg">{amount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Region</div>
                  <div className="font-medium">{region}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Category</div>
                  <div className="font-medium">{categories[0] || 'General'}</div>
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