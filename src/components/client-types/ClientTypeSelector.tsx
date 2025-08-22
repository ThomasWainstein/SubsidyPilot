import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, User, Heart, MapPin, Tractor } from 'lucide-react';

export type ClientType = 'business' | 'individual' | 'ngo' | 'municipality' | 'farmer';

interface ClientTypeOption {
  type: ClientType;
  title: string;
  description: string;
  icon: React.ReactNode;
  examples: string[];
  commonDocs: string[];
  eligibilityFocus: string[];
}

const clientTypeOptions: ClientTypeOption[] = [
  {
    type: 'business',
    title: 'Business / Company',
    description: 'Commercial enterprises, startups, SMEs, corporations',
    icon: <Building className="w-6 h-6" />,
    examples: ['SME', 'Startup', 'Corporation', 'Partnership'],
    commonDocs: ['Business registration', 'VAT certificate', 'Financial statements'],
    eligibilityFocus: ['Company size', 'Turnover', 'Sector', 'Innovation level']
  },
  {
    type: 'individual',
    title: 'Individual / Person',
    description: 'Private persons, freelancers, sole proprietors',
    icon: <User className="w-6 h-6" />,
    examples: ['Freelancer', 'Entrepreneur', 'Student', 'Researcher'],
    commonDocs: ['ID document', 'Tax returns', 'Income statements'],
    eligibilityFocus: ['Income level', 'Age', 'Education', 'Employment status']
  },
  {
    type: 'ngo',
    title: 'NGO / Non-Profit',
    description: 'Associations, charities, foundations, social enterprises',
    icon: <Heart className="w-6 h-6" />,
    examples: ['Association', 'Charity', 'Foundation', 'Social Enterprise'],
    commonDocs: ['Association statutes', 'Non-profit registration', 'Mission statement'],
    eligibilityFocus: ['Mission alignment', 'Beneficiary count', 'Geographic scope']
  },
  {
    type: 'municipality',
    title: 'Municipality / Public',
    description: 'Cities, towns, public administrations, government entities',
    icon: <MapPin className="w-6 h-6" />,
    examples: ['City Council', 'Public Administration', 'Government Agency'],
    commonDocs: ['Administrative certificate', 'Public entity documents', 'Budget documents'],
    eligibilityFocus: ['Population size', 'Administrative level', 'Geographic location']
  },
  {
    type: 'farmer',
    title: 'Farm / Agricultural',
    description: 'Agricultural operations, farms, rural enterprises',
    icon: <Tractor className="w-6 h-6" />,
    examples: ['Farm', 'Agricultural Cooperative', 'Rural Business'],
    commonDocs: ['Farm permits', 'CAP declarations', 'Agricultural certificates'],
    eligibilityFocus: ['Farm size', 'Agricultural activity', 'Organic certification']
  }
];

interface ClientTypeSelectorProps {
  selectedType?: ClientType;
  onTypeSelect: (type: ClientType) => void;
  detectedType?: ClientType;
  detectionConfidence?: number;
  className?: string;
}

export const ClientTypeSelector: React.FC<ClientTypeSelectorProps> = ({
  selectedType,
  onTypeSelect,
  detectedType,
  detectionConfidence,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {detectedType && detectionConfidence && detectionConfidence > 60 && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">AI Suggestion</span>
            <Badge variant="secondary" className="text-xs">
              {Math.round(detectionConfidence)}% confidence
            </Badge>
          </div>
          <p className="text-sm text-blue-800">
            Based on your document, this appears to be a <strong>{detectedType}</strong> profile.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clientTypeOptions.map((option) => (
          <Card 
            key={option.type}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedType === option.type 
                ? 'ring-2 ring-blue-500 bg-blue-50' 
                : detectedType === option.type 
                  ? 'ring-1 ring-blue-300 bg-blue-25'
                  : 'hover:bg-gray-50'
            }`}
            onClick={() => onTypeSelect(option.type)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedType === option.type 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {option.icon}
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  {detectedType === option.type && (
                    <Badge variant="outline" className="text-xs mt-1">
                      AI Detected
                    </Badge>
                  )}
                </div>
              </div>
              <CardDescription className="text-sm">
                {option.description}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0 space-y-3">
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Examples:</h4>
                <div className="flex flex-wrap gap-1">
                  {option.examples.map((example) => (
                    <Badge key={example} variant="secondary" className="text-xs">
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Common Documents:</h4>
                <ul className="text-xs text-gray-600 space-y-0.5">
                  {option.commonDocs.slice(0, 2).map((doc) => (
                    <li key={doc}>• {doc}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Eligibility Focus:</h4>
                <div className="flex flex-wrap gap-1">
                  {option.eligibilityFocus.slice(0, 2).map((focus) => (
                    <Badge key={focus} variant="outline" className="text-xs">
                      {focus}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedType && (
        <div className="flex justify-end pt-4">
          <Button 
            onClick={() => onTypeSelect(selectedType)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Continue with {clientTypeOptions.find(o => o.type === selectedType)?.title}
          </Button>
        </div>
      )}
    </div>
  );
};