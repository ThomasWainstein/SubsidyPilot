import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Euro, MapPin, Building2, Phone, Mail, ExternalLink, FileText, Download, Clock, Users, Target, CheckCircle, AlertTriangle } from 'lucide-react';

interface RawSubsidyContent {
  id: string;
  source_url: string;
  raw_text: string;
  raw_html?: string;
  combined_content_markdown?: string;
  sections_jsonb?: any;
  attachments_jsonb?: any;
  scrape_date: string;
  status: string;
}

interface CompleteSubsidyDisplayProps {
  data: RawSubsidyContent;
}

interface ParsedSubsidyContent {
  title: string;
  presentation: string;
  eligibility: string;
  dates: string[];
  amounts: string[];
  contacts: string[];
  procedures: string;
  documents: any[];
  fullSections: string[];
  structuredSections?: any[];
  summary?: any;
  metadata?: any;
}

const parseSubsidyContent = (rawText: string, html?: string, sections?: any): ParsedSubsidyContent => {
  // If we have structured sections from the enhanced processor, use those
  if (sections?.content_sections) {
    return {
      title: sections.summary?.core_identification?.title || 'Aide FranceAgriMer',
      presentation: '',
      eligibility: '',
      dates: sections.summary?.dates?.all_dates || [],
      amounts: sections.summary?.funding?.amounts_found || [],
      contacts: sections.summary?.contact?.contacts_found || [],
      procedures: '',
      documents: sections.attachments || [],
      fullSections: sections.content_sections.map((section: any) => 
        `${section.section_name}:\n${section.full_text}`
      ),
      structuredSections: sections.content_sections,
      summary: sections.summary,
      metadata: sections.metadata
    };
  }

  // Fallback to pattern-based extraction for legacy data
  const patterns = {
    title: /^([^|]*?)(?:\s*\|\s*FranceAgriMer|\s*–|\s*-)/,
    dates: /\d{2}\/\d{2}\/\d{4}/g,
    amounts: /(\d+(?:\.\d+)?)\s*€(?:\s*\/\s*ha)?/g,
    percentages: /(\d+(?:\.\d+)?)\s*%/g,
    contact: {
      email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
      phone: /(\d{2}\.\d{2}\.\d{2}\.\d{2}\.\d{2})/g,
      url: /(https?:\/\/[^\s]+)/g
    }
  };

  const extracted = {
    title: '',
    presentation: '',
    eligibility: '',
    dates: [] as string[],
    amounts: [] as string[],
    contacts: [] as string[],
    procedures: '',
    documents: [] as string[],
    fullSections: [] as string[]
  };

  // Extract title
  const titleMatch = rawText.match(patterns.title);
  if (titleMatch) {
    extracted.title = titleMatch[1].trim();
  }

  // Create flexible sections from ALL content
  const allLines = rawText.split('\n').filter(line => line.trim().length > 0);
  const contentSections: string[] = [];
  let currentSection = '';
  let currentContent = '';
  
  for (const line of allLines) {
    const trimmedLine = line.trim();
    
    // Check if this might be a section header (short line, followed by content)
    const mightBeHeader = trimmedLine.length < 50 && 
                         (trimmedLine.includes('?') || 
                          trimmedLine.toLowerCase().includes('présentation') ||
                          trimmedLine.toLowerCase().includes('aide') ||
                          trimmedLine.toLowerCase().includes('éligib') ||
                          trimmedLine.toLowerCase().includes('procédure') ||
                          trimmedLine.toLowerCase().includes('montant') ||
                          trimmedLine.toLowerCase().includes('document'));
    
    if (mightBeHeader && currentContent.length > 50) {
      // Save previous section
      if (currentSection && currentContent.trim()) {
        contentSections.push(`${currentSection}:\n${currentContent.trim()}`);
      }
      currentSection = trimmedLine;
      currentContent = '';
    } else {
      // Add to current content
      if (!currentSection && contentSections.length === 0) {
        currentSection = 'Informations principales';
      }
      currentContent += trimmedLine + '\n';
    }
  }
  
  // Save last section
  if (currentSection && currentContent.trim()) {
    contentSections.push(`${currentSection}:\n${currentContent.trim()}`);
  }
  
  // If no sections were created, add all content as one section
  if (contentSections.length === 0) {
    contentSections.push(`Contenu complet:\n${rawText}`);
  }
  
  extracted.fullSections = contentSections;

  // Extract specific information patterns
  const dateMatches = rawText.match(patterns.dates);
  if (dateMatches) {
    extracted.dates = [...new Set(dateMatches)];
  }

  const amountMatches = rawText.match(patterns.amounts);
  if (amountMatches) {
    extracted.amounts = [...new Set(amountMatches)];
  }

  const emailMatches = rawText.match(patterns.contact.email);
  const phoneMatches = rawText.match(patterns.contact.phone);
  if (emailMatches || phoneMatches) {
    extracted.contacts = [
      ...(emailMatches || []),
      ...(phoneMatches || [])
    ];
  }

  return extracted;
};

const formatContent = (content: string) => {
  // Clean up HTML entities and formatting
  let formatted = content
    .replace(/&rsquo;/g, '\'')
    .replace(/&lsquo;/g, '\'')
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  // Break into paragraphs
  return formatted.split(/[.!?]\s+(?=[A-Z])/).filter(p => p.trim().length > 10);
};

const ContentSection: React.FC<{ title: string; content: string; icon?: React.ReactNode }> = ({ 
  title, 
  content, 
  icon 
}) => {
  const paragraphs = formatContent(content);
  
  if (paragraphs.length === 0) return null;

  return (
    <Card className="border-l-4 border-l-accent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {paragraphs.map((paragraph, idx) => (
          <p key={idx} className="text-foreground/80 leading-relaxed">
            {paragraph.trim().endsWith('.') ? paragraph.trim() : paragraph.trim() + '.'}
          </p>
        ))}
      </CardContent>
    </Card>
  );
};

const InfoBadge: React.FC<{ label: string; value: string; icon?: React.ReactNode; variant?: 'default' | 'secondary' | 'destructive' | 'outline' }> = ({ 
  label, 
  value, 
  icon, 
  variant = 'secondary' 
}) => (
  <div className="flex items-center gap-2 p-3 bg-accent/5 rounded-lg border border-accent/20">
    {icon}
    <div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
    </div>
  </div>
);

export const CompleteSubsidyDisplay: React.FC<CompleteSubsidyDisplayProps> = ({ data }) => {
  const parsed = parseSubsidyContent(data.raw_text, data.raw_html, data.sections_jsonb);
  
  // Get metadata
  const scrapedDate = new Date(data.scrape_date).toLocaleDateString('fr-FR');
  const wordCount = data.raw_text.split(/\s+/).length;
  
  // Check if we have enhanced structured data
  const hasStructuredData = parsed.structuredSections && parsed.structuredSections.length > 0;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {parsed.title || 'Aide FranceAgriMer'}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                <CheckCircle className="h-3 w-3" />
                Contenu complet préservé
              </Badge>
              <span>•</span>
              <span>Extrait le {scrapedDate}</span>
              <span>•</span>
              <span>{wordCount.toLocaleString()} mots</span>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href={data.source_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Page originale
            </a>
          </Button>
        </div>

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {parsed.dates.length > 0 && (
            <InfoBadge
              label="Dates importantes"
              value={`${parsed.dates.length} date(s) identifiée(s)`}
              icon={<Calendar className="h-4 w-4 text-accent" />}
            />
          )}
          
          {parsed.amounts.length > 0 && (
            <InfoBadge
              label="Montants"
              value={parsed.amounts[0] || 'Voir détails'}
              icon={<Euro className="h-4 w-4 text-accent" />}
            />
          )}
          
          {parsed.contacts.length > 0 && (
            <InfoBadge
              label="Contacts"
              value={`${parsed.contacts.length} contact(s)`}
              icon={<Phone className="h-4 w-4 text-accent" />}
            />
          )}
          
          <InfoBadge
            label="Statut extraction"
            value={data.status === 'scraped' ? 'Réussie' : 'En cours'}
            icon={<CheckCircle className="h-4 w-4 text-green-500" />}
            variant={data.status === 'scraped' ? 'default' : 'secondary'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Structured Sections */}
          {hasStructuredData ? (
            // Use structured sections with full content preservation
            parsed.structuredSections.map((section: any, index: number) => {
              const iconMap: Record<string, React.ReactNode> = {
                'presentation': <Target className="h-4 w-4 text-accent" />,
                'beneficiaries': <Users className="h-4 w-4 text-accent" />,
                'timeline': <Calendar className="h-4 w-4 text-accent" />,
                'procedure': <CheckCircle className="h-4 w-4 text-accent" />,
                'funding': <Euro className="h-4 w-4 text-accent" />,
                'eligibility': <Users className="h-4 w-4 text-accent" />,
                'documents': <FileText className="h-4 w-4 text-accent" />,
                'contact': <Phone className="h-4 w-4 text-accent" />
              };
              
              return (
                <Card key={index} className="border-l-4 border-l-accent">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {iconMap[section.section_type] || <FileText className="h-4 w-4 text-accent" />}
                      {section.section_name}
                      {section.importance_score > 80 && (
                        <Badge variant="secondary" className="ml-2">Important</Badge>
                      )}
                    </CardTitle>
                    {section.contains_key_info && Object.keys(section.contains_key_info).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {section.contains_key_info.contains_dates?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            {section.contains_key_info.contains_dates.length} date(s)
                          </Badge>
                        )}
                        {section.contains_key_info.contains_amounts?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Euro className="h-3 w-3 mr-1" />
                            {section.contains_key_info.contains_amounts.length} montant(s)
                          </Badge>
                        )}
                        {section.contains_key_info.contains_contacts?.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Phone className="h-3 w-3 mr-1" />
                            {section.contains_key_info.contains_contacts.length} contact(s)
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Display FULL text content - no information loss */}
                    <div className="prose prose-sm max-w-none">
                      {section.full_text.split('\n').filter((line: string) => line.trim()).map((paragraph: string, pIdx: number) => (
                        <p key={pIdx} className="text-foreground/80 leading-relaxed mb-3">
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                    
                    {/* Show any specific key information extracted */}
                    {section.contains_key_info && (
                      <div className="mt-4 space-y-2">
                        {section.contains_key_info.contains_dates?.length > 0 && (
                          <div className="p-3 bg-accent/5 rounded-lg">
                            <div className="text-sm font-medium text-accent mb-1">Dates identifiées:</div>
                            <div className="flex flex-wrap gap-2">
                              {section.contains_key_info.contains_dates.map((date: string, dIdx: number) => (
                                <Badge key={dIdx} variant="secondary" className="text-xs">{date}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {section.contains_key_info.contains_amounts?.length > 0 && (
                          <div className="p-3 bg-accent/5 rounded-lg">
                            <div className="text-sm font-medium text-accent mb-1">Montants identifiés:</div>
                            <div className="flex flex-wrap gap-2">
                              {section.contains_key_info.contains_amounts.map((amount: string, aIdx: number) => (
                                <Badge key={aIdx} variant="secondary" className="text-xs">{amount}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            // Fallback to basic section parsing for legacy data
            parsed.fullSections.map((section, index) => {
              const [title, ...contentParts] = section.split(':\n');
              const content = contentParts.join(':\n');
              
              // Choose appropriate icon based on section title
              let icon = <FileText className="h-4 w-4 text-accent" />;
              if (title.toLowerCase().includes('présentation')) {
                icon = <Target className="h-4 w-4 text-accent" />;
              } else if (title.toLowerCase().includes('qui')) {
                icon = <Users className="h-4 w-4 text-accent" />;
              } else if (title.toLowerCase().includes('quand')) {
                icon = <Calendar className="h-4 w-4 text-accent" />;
              } else if (title.toLowerCase().includes('comment') || title.toLowerCase().includes('modalité')) {
                icon = <CheckCircle className="h-4 w-4 text-accent" />;
              } else if (title.toLowerCase().includes('montant')) {
                icon = <Euro className="h-4 w-4 text-accent" />;
              }
              
              return (
                <ContentSection
                  key={index}
                  title={title.trim()}
                  content={content}
                  icon={icon}
                />
              );
            })
          )}
          
          {/* Complete Raw Content as Ultimate Fallback */}
          {parsed.fullSections.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Contenu intégral
                  <Badge variant="outline" className="ml-2">Contenu brut préservé</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Affichage du contenu brut complet - aucune information n'est perdue.
                    </AlertDescription>
                  </Alert>
                  <div className="prose prose-sm max-w-none">
                    {data.raw_text.split('\n').filter(line => line.trim()).map((line, idx) => (
                      <p key={idx} className="text-foreground/80 leading-relaxed">
                        {line.trim()}
                      </p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Important Dates */}
          {parsed.dates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-accent" />
                  Dates importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {parsed.dates.map((date, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-accent/5 rounded-md">
                    <Clock className="h-3 w-3 text-accent" />
                    <span className="font-medium">{date}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Financial Information */}
          {parsed.amounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-4 w-4 text-accent" />
                  Informations financières
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {parsed.amounts.map((amount, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-accent/5 rounded-md">
                    <span className="font-semibold text-accent">{amount}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          {parsed.contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-accent" />
                  Contacts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {parsed.contacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-accent/5 rounded-md">
                    {contact.includes('@') ? 
                      <Mail className="h-3 w-3 text-accent" /> : 
                      <Phone className="h-3 w-3 text-accent" />
                    }
                    <span className="text-sm font-medium">{contact}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Documents */}
          {data.attachments_jsonb && Array.isArray(data.attachments_jsonb) && data.attachments_jsonb.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.attachments_jsonb.map((doc: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-accent/5 rounded-md">
                    <Download className="h-3 w-3 text-accent" />
                    <span className="text-sm">{doc.name || `Document ${idx + 1}`}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Métadonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source:</span>
                <span className="font-medium">FranceAgriMer</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statut:</span>
                <Badge variant={data.status === 'scraped' ? 'default' : 'secondary'}>
                  {data.status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taille:</span>
                <span>{Math.round(data.raw_text.length / 1024)}KB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <code className="text-xs bg-muted px-1 rounded">{data.id.slice(0, 8)}...</code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};