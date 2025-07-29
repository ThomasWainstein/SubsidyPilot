import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSearch, Users, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DocumentReviewTabProps {
  farmId: string;
}

const DocumentReviewTab = ({ farmId }: DocumentReviewTabProps) => {
  const navigate = useNavigate();

  const handleOpenReviewDashboard = () => {
    navigate(`/farm/${farmId}/document-review`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Document Review & Correction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review and correct AI-extracted data from your documents to improve accuracy and train the system.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileSearch className="h-8 w-8 text-blue-500" />
              <div>
                <h3 className="font-medium">Review Queue</h3>
                <p className="text-sm text-muted-foreground">View documents that need review</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Users className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-medium">Collaborative Review</h3>
                <p className="text-sm text-muted-foreground">Team-based document verification</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <h3 className="font-medium">Quality Insights</h3>
                <p className="text-sm text-muted-foreground">Track extraction accuracy over time</p>
              </div>
            </div>
          </div>
          
          <Button onClick={handleOpenReviewDashboard} className="w-full">
            Open Review Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentReviewTab;