import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Info, Send } from 'lucide-react';
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Farm } from '@/data/farms';

interface ProfileTabContentProps {
  farm: Farm;
  assistantInput: string;
  setAssistantInput: (value: string) => void;
  assistantResponse: string | null;
  isTyping: boolean;
  handleAssistantSubmit: (e: React.FormEvent) => void;
}

export const ProfileTabContent: React.FC<ProfileTabContentProps> = ({
  farm,
  assistantInput,
  setAssistantInput,
  assistantResponse,
  isTyping,
  handleAssistantSubmit
}) => {
  const { t } = useLanguage();

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('farm.profileTitle')}</CardTitle>
          <CardDescription>{t('farm.profileSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="divide-y divide-gray-100">
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900 flex items-center">
                Region
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Administrative region where the farm is located</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.region}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900 flex items-center">
                Size
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Total area of the farm in hectares</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.size}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Staff</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.staff}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Revenue</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.revenue}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Certifications</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.certifications.join(', ')}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Activities</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.activities.join(', ')}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900 flex items-center">
                Carbon Score
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Measure of farm's carbon reduction practices (0-100)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <div className="flex items-center gap-2">
                  <Progress value={farm.carbonScore} className="h-2 w-full max-w-xs" />
                  <span>{farm.carbonScore}/100</span>
                </div>
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Irrigation Method</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.irrigationMethod}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">Software Used</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.software.join(', ')}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('farm.assistantTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAssistantSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder={t('farm.assistantPlaceholder')}
                  value={assistantInput}
                  onChange={(e) => setAssistantInput(e.target.value)}
                />
              </div>

              {(assistantResponse || isTyping) && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  {isTyping ? (
                    <div className="typing-animation w-full">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-500 mr-1"></span>
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-500 mr-1"></span>
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-500"></span>
                    </div>
                  ) : (
                    <div className="flex">
                      <div className="w-8 h-8 rounded-full bg-agri-green flex items-center justify-center mr-2 flex-shrink-0">
                        <span className="text-white text-xs font-bold">A</span>
                      </div>
                      <p className="text-gray-700">{assistantResponse}</p>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit">
                <Send size={16} className="mr-2" />
                Send
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Region Opportunity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Grant Density</span>
                  <span className="font-medium">High</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Political Friendliness</span>
                  <span className="font-medium">Medium</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Recent Approvals</span>
                  <span className="font-medium">Very High</span>
                </div>
                <Progress value={92} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
