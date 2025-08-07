
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useApplications } from '@/hooks/useApplications';
import { Loader2, FileText, Calendar, Euro } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ApplicationsTabContentProps {
  farmId: string;
}

export const ApplicationsTabContent: React.FC<ApplicationsTabContentProps> = ({ farmId }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { data: applications, isLoading, error } = useApplications(farmId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('common.applications')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="animate-spin mr-2" />
            <span>{t('common.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('common.applications')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500">Error loading applications: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'submitted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText size={20} />
          {t('common.applications')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!applications || applications.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="mx-auto mb-4 text-gray-400" size={48} />
            <h3 className="text-lg font-medium mb-2 dark:text-white">No Applications Yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You haven't submitted any subsidy applications for this farm.
            </p>
            <Button>
              Browse Available Subsidies
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div key={application.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      Application #{application.id.slice(0, 8)}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Subsidy ID: {application.subsidy_id}
                    </p>
                  </div>
                  <Badge className={getStatusColor(application.status || 'draft')}>
                    {application.status || 'Draft'}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {application.submitted_at 
                        ? new Date(application.submitted_at).toLocaleDateString()
                        : 'Not submitted'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-300">
                      {application.notes ? 'Has notes' : 'No notes'}
                    </span>
                  </div>
                </div>

                {application.notes && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <p className="text-gray-700 dark:text-gray-300">{application.notes}</p>
                  </div>
                )}
                
                <div className="flex gap-2 mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/subsidy/${application.subsidy_id}`)}
                  >
                    View Subsidy Details
                  </Button>
                  {application.status === 'draft' && (
                    <Button size="sm">
                      Continue Application
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
