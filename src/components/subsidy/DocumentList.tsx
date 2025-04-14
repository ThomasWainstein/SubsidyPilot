
import { Button } from '@/components/ui/button';
import { FileText, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Progress } from '@/components/ui/progress';

interface RequiredDocument {
  name: string;
  type: 'official' | 'form';
  uploaded: boolean;
}

interface DocumentListProps {
  documents: RequiredDocument[];
  onUploadDocument: (index: number) => void;
  onGenerateForm: (index: number) => void;
  completionPercentage: number;
}

export const DocumentList = ({
  documents,
  onUploadDocument,
  onGenerateForm,
  completionPercentage
}: DocumentListProps) => {
  const { t } = useLanguage();
  const docsCompleteCount = documents.filter(doc => doc.uploaded).length;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">{t('application.documentChecklist')}</h3>
        <div className="text-sm text-gray-500">
          {docsCompleteCount} {t('application.docsReady')} {documents.length}
        </div>
      </div>
      
      <Progress value={completionPercentage} className="h-2" />
      
      <div className="border rounded-md divide-y">
        {documents.map((doc, index) => (
          <div key={index} className="p-4 flex items-center justify-between">
            <div className="flex items-center">
              <FileText size={18} className="mr-2 text-gray-400" />
              <div>
                <p className="font-medium">{doc.name}</p>
                <p className="text-xs text-gray-500">
                  {doc.type === 'official' ? t('application.officialDocument') : t('application.applicationForm')}
                </p>
              </div>
            </div>
            
            <div>
              {doc.uploaded ? (
                <div className="flex items-center text-green-600">
                  <FileText size={18} className="mr-1" />
                  <span className="text-sm">{t('application.ready')}</span>
                </div>
              ) : doc.type === 'form' ? (
                <Button size="sm" onClick={() => onGenerateForm(index)}>
                  <FileText size={14} className="mr-1" />
                  {t('common.generateForm')}
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => onUploadDocument(index)}>
                  <Upload size={14} className="mr-1" />
                  {t('common.uploadNow')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
