
import { useState } from 'react';
import { useLanguage } from '@/contexts/language';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, FileText, FileSpreadsheet, Trash2 } from 'lucide-react';
import { farmDocuments } from '@/data/farms';
import { toast } from '@/components/ui/use-toast';
import { DropzoneUpload } from '@/components/document/DropzoneUpload';

interface FarmDocument {
  id: string;
  name: string;
  type: string;
  tag: string;
  uploadedAt: string;
}

interface DocumentVaultProps {
  farmId: string;
}

const DocumentVault = ({ farmId }: DocumentVaultProps) => {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<FarmDocument[]>(
    farmDocuments[farmId] || []
  );
  
  // Document type icons
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText size={20} className="text-red-500" />;
      case 'XLSX':
        return <FileSpreadsheet size={20} className="text-green-500" />;
      default:
        return <File size={20} className="text-blue-500" />;
    }
  };
  
  // Handle successful upload
  const handleUploadSuccess = (newDoc: FarmDocument) => {
    if (newDoc) {
      setDocuments(prev => [...prev, newDoc]);
    }
  };
  
  // Handle document delete
  const handleDelete = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    toast({
      title: t('messages.documentRemoved'),
      description: t('messages.documentRemovedDesc'),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('farm.documentTitle')}</CardTitle>
        <CardDescription>{t('farm.documentSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DropzoneUpload onUploadSuccess={handleUploadSuccess} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documents.map((doc) => (
            <div 
              key={doc.id} 
              className="p-3 border rounded-lg bg-white shadow-sm flex items-center justify-between animate-fade-in"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-gray-100">
                  {getDocumentIcon(doc.type)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">{doc.name}</p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {doc.tag}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {doc.uploadedAt}
                    </span>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDelete(doc.id)} 
                className="text-gray-400 hover:text-red-500"
                aria-label={t('common.delete')}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentVault;
