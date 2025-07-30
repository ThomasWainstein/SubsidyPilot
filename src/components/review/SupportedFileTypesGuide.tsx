import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Image, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  HelpCircle,
  Info
} from 'lucide-react';

const SupportedFileTypesGuide = () => {
  const supportedTypes = [
    {
      category: 'Documents',
      icon: <FileText className="h-5 w-5" />,
      types: [
        { name: 'PDF', extension: '.pdf', support: 'excellent', note: 'Text-based PDFs work best' },
        { name: 'Word Document', extension: '.docx', support: 'excellent', note: 'Full support for modern format' },
        { name: 'Text File', extension: '.txt', support: 'good', note: 'Plain text extraction' },
        { name: 'CSV', extension: '.csv', support: 'good', note: 'Structured data extraction' },
        { name: 'Excel', extension: '.xlsx', support: 'limited', note: 'Basic text extraction only' }
      ]
    },
    {
      category: 'Images',
      icon: <Image className="h-5 w-5" />,
      types: [
        { name: 'JPEG', extension: '.jpg/.jpeg', support: 'limited', note: 'OCR required - lower accuracy' },
        { name: 'PNG', extension: '.png', support: 'limited', note: 'OCR required - lower accuracy' },
        { name: 'Scanned PDFs', extension: '.pdf', support: 'limited', note: 'OCR required - may need manual review' }
      ]
    }
  ];

  const getSupportIcon = (support: string) => {
    switch (support) {
      case 'excellent': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good': return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'limited': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'none': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSupportBadge = (support: string) => {
    const variants = {
      excellent: 'default',
      good: 'secondary',
      limited: 'outline',
      none: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[support as keyof typeof variants] || 'secondary'}>
        {support}
      </Badge>
    );
  };

  const handleDownloadSample = (type: string) => {
    // In a real implementation, these would be actual sample files
    const sampleFiles = {
      'pdf': '/samples/farm-registration-sample.pdf',
      'docx': '/samples/farm-registration-sample.docx',
      'txt': '/samples/farm-data-sample.txt',
      'csv': '/samples/farm-inventory-sample.csv'
    };
    
    toast({
      title: 'Sample file',
      description: `Sample ${type.toUpperCase()} file would be downloaded in a real implementation.`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Supported File Types</h2>
        <p className="text-muted-foreground">
          Learn which file formats work best with our extraction system and download sample files for testing.
        </p>
      </div>

      {/* File Type Support */}
      <div className="grid gap-6">
        {supportedTypes.map((category) => (
          <Card key={category.category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {category.icon}
                {category.category}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {category.types.map((type) => (
                  <div key={type.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getSupportIcon(type.support)}
                      <div>
                        <h4 className="font-medium">{type.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {type.extension} • {type.note}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSupportBadge(type.support)}
                      {['pdf', 'docx', 'txt', 'csv'].includes(type.extension.split('.')[1]) && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadSample(type.extension.split('.')[1])}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Sample
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Best Practices for Document Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Text-based documents</strong> (PDF, DOCX, TXT) provide the most accurate extraction results.
            </AlertDescription>
          </Alert>

          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">High-quality scans</h4>
                <p className="text-sm text-muted-foreground">
                  If uploading images or scanned documents, ensure high resolution (300+ DPI) and good contrast.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Clear text</h4>
                <p className="text-sm text-muted-foreground">
                  Avoid handwritten documents or documents with decorative fonts for best results.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium">Structured format</h4>
                <p className="text-sm text-muted-foreground">
                  Documents with clear sections and labels extract more accurately than free-form text.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium">File size limits</h4>
                <p className="text-sm text-muted-foreground">
                  Keep files under 50MB for optimal processing speed. Large files may take longer to process.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Troubleshooting Common Issues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-red-600 mb-2">Why did my extraction return no fields?</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Document may be image-based without OCR</li>
                <li>• File may be corrupted or encrypted</li>
                <li>• Document format may not be fully supported</li>
                <li>• Text may be too small or low contrast to read</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-yellow-600 mb-2">Why is confidence low (&lt;70%)?</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Document structure doesn't match expected format</li>
                <li>• Text quality is poor or contains errors</li>
                <li>• Required fields are missing or unclear</li>
                <li>• Document is in an unsupported language</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-blue-600 mb-2">How to improve extraction results?</h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Use our sample documents as templates</li>
                <li>• Ensure documents follow standard formats</li>
                <li>• Include clear section headers and labels</li>
                <li>• Use the manual review feature to correct and train the system</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportedFileTypesGuide;