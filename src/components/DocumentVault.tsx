
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
        return 'bg-blue-100 text-blue-800';
      case 'certificate':
        return 'bg-green-100 text-green-800';
      case 'application':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText size={20} />
            Document Vault
          </span>
          <Button size="sm">
            <Upload size={16} className="mr-2" />
            Upload
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium mb-2">No documents uploaded</h3>
            <p className="text-gray-600 mb-4">
              Start by uploading your farm documents and certificates.
            </p>
            <Button>
              <Upload size={16} className="mr-2" />
              Upload Documents
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText size={20} className="text-gray-500" />
                  <div>
                    <h4 className="font-medium text-gray-900">{doc.name}</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{doc.type}</span>
                      <span>•</span>
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{doc.uploadedAt.toLocaleDateString()}</span>
                      <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(doc.category)}`}>
                        {doc.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Eye size={16} />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download size={16} />
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
