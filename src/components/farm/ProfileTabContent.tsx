
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Zap, Calendar } from 'lucide-react';
import { useFarm } from '@/hooks/useFarms';

interface ProfileTabContentProps {
  farmId: string;
}

export const ProfileTabContent: React.FC<ProfileTabContentProps> = ({ farmId }) => {
  const { data: farm, isLoading } = useFarm(farmId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!farm) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Farm not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin size={20} />
            Farm Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Farm Name</label>
              <p className="text-gray-900 dark:text-white">{farm.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Address</label>
              <p className="text-gray-900 dark:text-white">{farm.address}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Total Hectares</label>
              <p className="text-gray-900 dark:text-white">
                {farm.total_hectares ? `${farm.total_hectares} ha` : 'Not specified'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Legal Status</label>
              <p className="text-gray-900 dark:text-white">{farm.legal_status || 'Not specified'}</p>
            </div>
          </div>

          {farm.land_use_types && farm.land_use_types.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">Land Use Types</label>
              <div className="flex flex-wrap gap-2">
                {farm.land_use_types.map((type, index) => (
                  <Badge key={index} variant="secondary">
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {farm.certifications && farm.certifications.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-500 block mb-2">Certifications</label>
              <div className="flex flex-wrap gap-2">
                {farm.certifications.map((cert, index) => (
                  <Badge key={index} variant="outline">
                    {cert}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={20} />
            Operations
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {farm.staff_count || 0}
            </div>
            <div className="text-sm text-gray-500">Staff Members</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {farm.livestock_present ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-gray-500">Livestock Present</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {farm.irrigation_method || 'N/A'}
            </div>
            <div className="text-sm text-gray-500">Irrigation Method</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
