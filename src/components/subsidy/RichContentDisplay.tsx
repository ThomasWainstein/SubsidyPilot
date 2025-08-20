/**
 * Rich content display for subsidies without extractable documents
 * Handles Les Aides and other web-based subsidy information
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  MapPin, 
  Euro, 
  Calendar, 
  FileText, 
  Phone, 
  Mail, 
  Globe,
  Users,
  CheckCircle
} from 'lucide-react';
import { ExtractedSubsidyData } from '@/lib/extraction/source-extractors';

interface RichContentDisplayProps {
  extractedData: ExtractedSubsidyData;
  originalData?: any;
}

export const RichContentDisplay: React.FC<RichContentDisplayProps> = ({ 
  extractedData, 
  originalData 
}) => {
  const formatHtmlContent = (content: string) => {
    if (!content) return '';
    
    // Simple HTML cleanup for display
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  };

  const renderContactInfo = () => {
    if (!extractedData.contactInfo || Object.keys(extractedData.contactInfo).length === 0) {
      return null;
    }

    const contact = extractedData.contactInfo;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {contact.organization && (
            <div className="flex items-center gap-2">
              <Badge variant="outline">{contact.organization}</Badge>
            </div>
          )}
          
          {contact.address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
              <span className="text-sm">{contact.address}</span>
            </div>
          )}
          
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{contact.phone}</span>
            </div>
          )}
          
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a 
                href={`mailto:${contact.email}`}
                className="text-sm text-primary hover:underline"
              >
                {contact.email}
              </a>
            </div>
          )}
          
          {contact.website && (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <a 
                href={contact.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {contact.website}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderApplicationProcess = () => {
    if (!extractedData.applicationProcess || extractedData.applicationProcess.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Application Process
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {extractedData.applicationProcess.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <Badge variant="outline" className="min-w-[24px] h-6 text-xs">
                  {index + 1}
                </Badge>
                <span className="text-sm leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
          
          {extractedData.applicationUrl && (
            <div className="mt-4 pt-4 border-t">
              <Button asChild className="w-full">
                <a 
                  href={extractedData.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  Visit Application Page
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderRequirements = () => {
    if (!extractedData.requirements || extractedData.requirements.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Requirements & Eligibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {extractedData.requirements.map((requirement, index) => (
              <div key={index} className="text-sm leading-relaxed">
                {formatHtmlContent(requirement)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderDocuments = () => {
    if (!extractedData.documents || extractedData.documents.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Related Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {extractedData.documents.map((doc, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-sm">{doc.name}</div>
                  {doc.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {doc.description}
                    </div>
                  )}
                </div>
                {doc.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      View
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{extractedData.title}</span>
            <Badge variant="secondary">{extractedData.agency}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Euro className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">{extractedData.amount}</span>
            </div>
            
            {extractedData.region && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{extractedData.region}</span>
              </div>
            )}
            
            {extractedData.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{extractedData.deadline}</span>
              </div>
            )}
          </div>
          
          {/* Description */}
          {extractedData.description && (
            <div>
              <h4 className="font-medium mb-2">Program Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formatHtmlContent(extractedData.description)}
              </p>
            </div>
          )}
          
          {/* Funding Details */}
          {extractedData.fundingDetails && extractedData.fundingDetails !== extractedData.description && (
            <div>
              <h4 className="font-medium mb-2">Funding Details</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formatHtmlContent(extractedData.fundingDetails)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirements */}
      {renderRequirements()}

      {/* Application Process */}
      {renderApplicationProcess()}

      {/* Documents */}
      {renderDocuments()}

      {/* Contact Information */}
      {renderContactInfo()}
    </div>
  );
};