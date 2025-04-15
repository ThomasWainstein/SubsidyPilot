
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { applications } from '@/data/subsidies';
import { BarChart4, CheckCircle2 } from 'lucide-react';

interface ApplicationsTabContentProps {
  farmId: string;
}

export const ApplicationsTabContent: React.FC<ApplicationsTabContentProps> = ({ farmId }) => {
  const { t } = useLanguage();
  const farmApplications = applications[farmId] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Application Dashboard</CardTitle>
        <CardDescription>Track and manage your subsidy applications</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border rounded-md">
          <div className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500 border-b grid grid-cols-12">
            <div className="col-span-4">Subsidy Name</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Submitted</div>
            <div className="col-span-2">Amount</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          
          {farmApplications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No applications found
            </div>
          ) : (
            <div className="divide-y">
              {farmApplications.map((app) => (
                <div key={app.id} className="px-4 py-3 text-sm grid grid-cols-12 items-center">
                  <div className="col-span-4">{app.subsidyName}</div>
                  <div className="col-span-2">
                    <StatusBadge status={app.status} />
                  </div>
                  <div className="col-span-2">{app.submittedDate}</div>
                  <div className="col-span-2">{app.grantAmount}</div>
                  <div className="col-span-2 flex justify-end space-x-2">
                    <Button size="sm" variant="outline">
                      {t('common.viewDetails')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {farmApplications.some(app => app.status === 'Approved') && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200 flex items-start">
            <CheckCircle2 className="text-green-500 mr-3 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800">Approved Applications</h4>
              <p className="text-sm text-green-700 mt-1">
                {farmApplications.filter(app => app.status === 'Approved').length} of your applications have been approved. 
                View the details to download acceptance certificates and fund allocation schedules.
              </p>
              <div className="mt-2">
                <Button size="sm" variant="outline" className="bg-white">
                  <BarChart4 size={14} className="mr-2" />
                  Fund Allocation Report
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
