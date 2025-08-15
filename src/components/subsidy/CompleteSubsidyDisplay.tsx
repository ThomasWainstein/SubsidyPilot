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

const parseSubsidyContent = (rawText: string, html?: string, sections?: any) => {
  // Extract key information from the raw text using patterns
  const patterns = {
    title: /^([^|]*?)(?:\s*\|\s*FranceAgriMer|\s*–|\s*-)/,
    dates: {
      publication: /Date de publication\s*:\s*(\d{2}\/\d{2}\/\d{4})/,
      availability: /Disponible du\s*(\d{2}\/\d{2}\/\d{4})\s*au\s*(\d{2}\/\d{2}\/\d{4})/,
      deposit: /Dépôt des demandes du\s*(\d{2})\s*(\w+)\s*au\s*(\d{2})\s*(\w+)\s*(\d{4})/,
      deadline: /au plus tard le\s*(\d{2}\/\d{2}\/\d{4})/g,
      versement: /au plus tard le\s*(\d{2}\/\d{2}\/\d{4})/g
    },
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

  // Split content into logical sections
  const sectionMarkers = [
    'Présentation',
    'Pour qui ?',
    'Quand ?',
    'Comment ?',
    'Modalités',
    'Montant de l\'aide',
    'Instruction des demandes',
    'Éligibilité',
    'Démarches',
    'Documents associés'
  ];

  // Create sections from content
  let currentSection = '';
  let currentContent = '';
  
  const lines = rawText.split('\n').filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this line is a section marker
    const isSection = sectionMarkers.some(marker => 
      line.toLowerCase().includes(marker.toLowerCase()) && 
      line.length < marker.length + 20
    );
    
    if (isSection) {
      // Save previous section
      if (currentSection && currentContent.trim()) {
        extracted.fullSections.push(`${currentSection}:\n${currentContent.trim()}`);
      }
      
      currentSection = line;
      currentContent = '';
    } else {
      currentContent += line + '\n';
    }
  }
  
  // Save last section
  if (currentSection && currentContent.trim()) {
    extracted.fullSections.push(`${currentSection}:\n${currentContent.trim()}`);
  }

  // Extract specific information
  const dateMatches = rawText.match(/\d{2}\/\d{2}\/\d{4}/g);
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
          {/* All Sections */}
          {parsed.fullSections.map((section, index) => {
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
          })}
          
          {/* Raw Content as Fallback */}
          {parsed.fullSections.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-accent" />
                  Contenu intégral
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {formatContent(data.raw_text).map((paragraph, idx) => (
                    <p key={idx} className="text-foreground/80 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
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