
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, FileText, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardNavigationPanelProps {
  onAddFarm: () => void;
}

const DashboardNavigationPanel = ({ onAddFarm }: DashboardNavigationPanelProps) => {
  const navigate = useNavigate();

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={onAddFarm} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Farm
          </Button>
          
          <Button variant="outline" onClick={() => navigate('/calendar')} className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </Button>
          
          <Button variant="outline" onClick={() => navigate('/subsidies')} className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Find Subsidies
          </Button>
          
          <Button variant="outline" onClick={() => navigate('/regulations')} className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Regulations
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardNavigationPanel;
