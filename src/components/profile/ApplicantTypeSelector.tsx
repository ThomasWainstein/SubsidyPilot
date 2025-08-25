import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type ApplicantType = 'individual' | 'business' | 'nonprofit' | 'municipality';

interface ApplicantTypeSelectorProps {
  selectedType?: ApplicantType;
  onTypeSelect: (type: ApplicantType) => void;
  className?: string;
}

const applicantTypes = [
  {
    type: 'individual' as ApplicantType,
    icon: '👤',
    title: 'Individual',
    description: 'Personal funding, freelancers, sole proprietors',
    examples: ['Personal grants', 'Education funding', 'Housing assistance', 'Training programs']
  },
  {
    type: 'business' as ApplicantType,
    icon: '🏢',
    title: 'Business',
    description: 'Companies, startups, SMEs, corporations',
    examples: ['Innovation grants', 'Export support', 'R&D funding', 'Digital transformation']
  },
  {
    type: 'nonprofit' as ApplicantType,
    icon: '🤝',
    title: 'Non-Profit',
    description: 'NGOs, charities, foundations, associations',
    examples: ['Social programs', 'Community projects', 'Cultural initiatives', 'Environmental actions']
  },
  {
    type: 'municipality' as ApplicantType,
    icon: '🏛️',
    title: 'Municipality',
    description: 'Cities, towns, local governments',
    examples: ['Infrastructure', 'Urban development', 'Public services', 'Smart city projects']
  }
];

export const ApplicantTypeSelector = ({ selectedType, onTypeSelect, className }: ApplicantTypeSelectorProps) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {applicantTypes.map((type) => (
        <Card 
          key={type.type} 
          className={`cursor-pointer transition-all hover:shadow-lg ${
            selectedType === type.type 
              ? 'ring-2 ring-primary border-primary bg-primary/5' 
              : 'hover:border-primary/50'
          }`}
          onClick={() => onTypeSelect(type.type)}
        >
          <CardContent className="p-6 text-center">
            <div className="text-4xl mb-3">{type.icon}</div>
            <h3 className="font-semibold text-lg mb-2">{type.title}</h3>
            <p className="text-sm text-muted-foreground mb-4">{type.description}</p>
            
            <div className="space-y-1">
              {type.examples.slice(0, 2).map((example, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {example}
                </Badge>
              ))}
            </div>
            
            {selectedType === type.type && (
              <Badge className="mt-3 w-full justify-center">
                Selected
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};