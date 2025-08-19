import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, Shield, CheckCircle } from 'lucide-react';

interface EnhancedDashboardHeaderProps {
  farmCount: number;
  onAddFarm: () => void;
  hasIssues?: boolean;
  completionRate?: number;
}

const EnhancedDashboardHeader: React.FC<EnhancedDashboardHeaderProps> = ({
  farmCount,
  onAddFarm,
  hasIssues = false,
  completionRate = 0
}) => {
  return (
    <div className="space-y-6">
      {/* Main Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            My Farms Overview
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your farms and track funding opportunities
          </p>
        </div>
        <Button onClick={onAddFarm} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Farm
        </Button>
      </div>

      {/* Status Banner - Only show if we have real data */}
      {farmCount > 0 && (
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {farmCount} {farmCount === 1 ? 'Farm' : 'Farms'} in Portfolio
                  </span>
                </div>
                
                {/* Only show completion rate if we have meaningful data */}
                {completionRate > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">
                      {Math.round(completionRate)}% profiles complete
                    </span>
                  </div>
                )}
              </div>
              
              {/* Status indicator - only show if there are real issues */}
              {hasIssues ? (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  Action Required
                </Badge>
              ) : farmCount > 0 ? (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  All Good
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State Message */}
      {farmCount === 0 && (
        <Card className="border-dashed border-2">
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Start Your Farming Journey?</h3>
            <p className="text-muted-foreground mb-4">
              Add your first farm to discover available funding opportunities and manage your agricultural operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button onClick={onAddFarm} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Farm
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedDashboardHeader;