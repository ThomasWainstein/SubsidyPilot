
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Download, Eye } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: Date;
  category: 'permit' | 'certificate' | 'application' | 'other';
}

interface DocumentVaultProps {
  farmId?: string;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({ farmId }) => {
  // Sample documents
  const documents: Document[] = [
    {
      id: '1',
      name: 'Environmental Permit 2024.pdf',
      type: 'PDF',
      size: '2.3 MB',
      uploadedAt: new Date('2024-01-15'),
      category: 'permit'
    },
    {
      id: '2',
      name: 'Organic Certification.pdf',
      type: 'PDF',
      size: '1.8 MB',
      uploadedAt: new Date('2024-02-01'),
      category: 'certificate'
    },
    {
      id: '3',
      name: 'Subsidy Application Draft.docx',
      type: 'DOCX',
      size: '856 KB',
      uploadedAt: new Date('2024-02-10'),
      category: 'application'
    }
  ];

  const getCategoryColor = (category: Document['category']) => {
    switch (category) {
      case 'permit':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'certificate':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'application':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span className="flex items-center gap-2 text-lg md:text-xl">
            <FileText size={20} className="flex-shrink-0" />
            Document Vault
          </span>
          <Button size="sm" className="w-full sm:w-auto min-h-[44px]">
            <Upload size={16} className="mr-2 flex-shrink-0" />
            Upload
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 px-4">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium mb-2">No documents uploaded</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm md:text-base">
              Start by uploading your farm documents and certificates.
            </p>
            <Button className="w-full sm:w-auto min-h-[44px]">
              <Upload size={16} className="mr-2" />
              Upload Documents
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <FileText size={20} className="text-gray-500 mt-1 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm md:text-base truncate">
                      {doc.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                        <span>{doc.type}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span className="hidden sm:inline">{doc.uploadedAt.toLocaleDateString()}</span>
                        <span className="sm:hidden">{doc.uploadedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(doc.category)}`}>
                        {doc.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-center">
                  <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] p-2">
                    <Eye size={16} />
                    <span className="sr-only">View document</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="min-h-[36px] min-w-[36px] p-2">
                    <Download size={16} />
                    <span className="sr-only">Download document</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
