import React from 'react';
import { useLanguage } from '@/contexts/language';
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
                {t('common.region')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('form.tooltip.region')}</p>
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
                {t('common.size')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('form.tooltip.size')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.size}
              </dd>
            </div>
            
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">{t('form.staff')}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.staff}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">{t('form.revenue')}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.revenue}
              </dd>
            </div>
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">{t('form.certifications')}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.certifications.join(', ')}
              </dd>
            </div>
            
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">{t('common.activities')}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.activities.join(', ')}
              </dd>
            </div>
            
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900 flex items-center">
                {t('form.carbonScore')}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="ml-1 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('form.tooltip.carbonScore')}</p>
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
              <dt className="text-sm font-medium leading-6 text-gray-900">{t('form.irrigationMethod')}</dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                {farm.irrigationMethod}
              </dd>
            </div>
            
            <div className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
              <dt className="text-sm font-medium leading-6 text-gray-900">{t('common.software')}</dt>
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
                {t('common.send')}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('farm.regionOpportunityScore')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('farm.grantDensity')}</span>
                  <span className="font-medium">{t('farm.high')}</span>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('farm.politicalFriendliness')}</span>
                  <span className="font-medium">{t('farm.medium')}</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('farm.recentApprovals')}</span>
                  <span className="font-medium">{t('farm.veryHigh')}</span>
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
