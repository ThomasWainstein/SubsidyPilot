
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { farms } from '@/data/farms';
import FarmCard from '@/components/FarmCard';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const DashboardPage = () => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddFarmModalOpen, setIsAddFarmModalOpen] = useState(false);

  // Filter farms based on search query
  const filteredFarms = farms.filter(farm => 
    farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farm.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farm.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
            <p className="text-gray-600">{t('dashboard.subtitle')}</p>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                type="text"
                placeholder="Search farms..."
                className="pl-10 w-full md:w-80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Button onClick={() => setIsAddFarmModalOpen(true)}>
              <Plus size={18} className="mr-2" />
              {t('common.addNewFarm')}
            </Button>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFarms.map(farm => (
              <FarmCard key={farm.id} farm={farm} />
            ))}
          </div>
        </div>
      </main>
      
      {/* Add Farm Modal */}
      <Dialog open={isAddFarmModalOpen} onOpenChange={setIsAddFarmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.addNewFarm')}</DialogTitle>
            <DialogDescription>
              Choose how you want to add a new farm to your portfolio.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="manual" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              <TabsTrigger value="document">Document Upload</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="farm-name">Farm Name</Label>
                <Input id="farm-name" placeholder="Enter farm name" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm-region">Region</Label>
                <Input id="farm-region" placeholder="Enter region" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="farm-tags">Tags (comma separated)</Label>
                <Input id="farm-tags" placeholder="organic, sustainability, etc." />
              </div>
            </TabsContent>
            
            <TabsContent value="document" className="space-y-4 py-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">Drag and drop files here, or click to select files</p>
                <p className="mt-1 text-xs text-gray-500">Support for PDFs, Excel and Word documents</p>
                <Button variant="outline" className="mt-4">Select Files</Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFarmModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => setIsAddFarmModalOpen(false)}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
