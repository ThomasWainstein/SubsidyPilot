
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { farms } from '@/data/farms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBadge from '@/components/StatusBadge';
import { CalendarDays } from 'lucide-react';
import { ProfileTabContent } from '@/components/farm/ProfileTabContent';
import { DocumentsTabContent } from '@/components/farm/DocumentsTabContent';
import { SubsidiesTabContent } from '@/components/farm/SubsidiesTabContent';
import { ApplicationsTabContent } from '@/components/farm/ApplicationsTabContent';

const FarmProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantResponse, setAssistantResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Find farm data
  const farm = farms.find(f => f.id === id);
  if (!farm) return <div>Farm not found</div>;

  // Handle assistant input
  const handleAssistantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantInput.trim()) return;
    
    // Simulate typing animation
    setIsTyping(true);
    setAssistantResponse('');
    
    // Simulate response after a delay
    setTimeout(() => {
      setAssistantResponse(t('farm.assistantResponse'));
      setIsTyping(false);
    }, 1500);
    
    // Clear input
    setAssistantInput('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{farm.name}</h1>
                <div className="flex items-center mt-2 gap-2">
                  <StatusBadge status={farm.status} />
                  <span className="text-sm text-gray-500">
                    <CalendarDays size={14} className="inline mr-1" />
                    {t('common.lastUpdated')}: {farm.updatedAt}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 md:grid-cols-4">
              <TabsTrigger value="profile">{t('common.profile')}</TabsTrigger>
              <TabsTrigger value="documents">{t('common.documents')}</TabsTrigger>
              <TabsTrigger value="subsidies">{t('common.subsidies')}</TabsTrigger>
              <TabsTrigger value="applications">{t('common.applications')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="profile">
              <ProfileTabContent
                farm={farm}
                assistantInput={assistantInput}
                setAssistantInput={setAssistantInput}
                assistantResponse={assistantResponse}
                isTyping={isTyping}
                handleAssistantSubmit={handleAssistantSubmit}
              />
            </TabsContent>
            
            <TabsContent value="documents">
              <DocumentsTabContent farmId={farm.id} />
            </TabsContent>
            
            <TabsContent value="subsidies">
              <SubsidiesTabContent farmId={farm.id} />
            </TabsContent>
            
            <TabsContent value="applications">
              <ApplicationsTabContent farmId={farm.id} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default FarmProfilePage;
