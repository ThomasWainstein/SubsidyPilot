
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Check, Download } from 'lucide-react';

interface RequiredDocument {
  name: string;
  type: 'official' | 'form';
  uploaded: boolean;
}

interface ApplicationSummaryProps {
  documents: RequiredDocument[];
  onDownloadDocument: (name: string) => void;
  onContinueToPortal: () => void;
}

export const ApplicationSummary = ({
  documents,
  onDownloadDocument,
  onContinueToPortal
}: ApplicationSummaryProps) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-md border border-green-100">
        <h3 className="font-medium text-green-800 flex items-center">
          <Check size={18} className="mr-2" />
          {t('application.prepComplete')}
        </h3>
        <p className="text-sm text-green-700 mt-1">
          {t('application.prepCompleteMessage')}
        </p>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-sm font-medium">{t('application.platformSummary')}</h3>
        
        <div className="border rounded-md divide-y">
          <div className="p-3 flex items-center">
            <Check size={16} className="mr-2 text-green-500" />
            <span className="text-sm">{t('application.docsVerified')}</span>
          </div>
          
          <div className="p-3 flex items-center">
            <Check size={16} className="mr-2 text-green-500" />
            <span className="text-sm">{t('application.formsAutofilled')}</span>
          </div>
          
          <div className="p-3 flex items-center">
            <Check size={16} className="mr-2 text-green-500" />
            <span className="text-sm">{t('application.previewGenerated')}</span>
          </div>
        </div>
      </div>
      
      <div className="pt-2">
        <h3 className="text-sm font-medium mb-2">{t('application.downloadDocs')}</h3>
        
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <Button 
              key={index}
              variant="outline" 
              className="w-full justify-start"
              onClick={() => onDownloadDocument(doc.name)}
            >
              <Download size={14} className="mr-2" />
              {doc.name}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
        <h3 className="font-medium text-blue-800">{t('application.readyToApply')}</h3>
        <p className="text-sm text-blue-700 mt-1">
          {t('application.readyToApplyMessage')}
        </p>
      </div>
      
      <div className="bg-amber-50 p-3 rounded-md border border-amber-100">
        <p className="text-sm text-amber-700 flex items-start">
          <svg className="w-4 h-4 mr-2 mt-0.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {t('application.extensionHelp')}
        </p>
      </div>
      
      <Button 
        className="w-full mt-4" 
        onClick={onContinueToPortal}
        size="lg"
      >
        {t('common.continueToEUPortal')}
      </Button>
    </div>
  );
};
