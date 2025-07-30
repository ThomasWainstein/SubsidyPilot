import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  CheckSquare, 
  Square, 
  Filter,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw
} from 'lucide-react';
import { getConfidenceLevel } from './ConfidenceBadge';

interface FieldData {
  key: string;
  label: string;
  value: any;
  confidence: number;
  type: string;
  category: string;
  accepted?: boolean;
  modified?: boolean;
}

interface BulkActionBarProps {
  fields: FieldData[];
  selectedFields: string[];
  onBulkAccept: (fieldKeys: string[]) => void;
  onBulkReject: (fieldKeys: string[]) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  onFilterByConfidence: (level: 'high' | 'medium' | 'low' | 'all') => void;
  onUndo?: () => void;
  canUndo?: boolean;
  className?: string;
}

const BulkActionBar: React.FC<BulkActionBarProps> = ({
  fields,
  selectedFields,
  onBulkAccept,
  onBulkReject,
  onSelectAll,
  onSelectNone,
  onFilterByConfidence,
  onUndo,
  canUndo = false,
  className = ''
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  
  const selectedCount = selectedFields.length;
  const totalFields = fields.length;
  
  // Calculate confidence-based counts
  const highConfidenceFields = fields.filter(f => getConfidenceLevel(f.confidence) === 'high');
  const mediumConfidenceFields = fields.filter(f => getConfidenceLevel(f.confidence) === 'medium');
  const lowConfidenceFields = fields.filter(f => getConfidenceLevel(f.confidence) === 'low');
  
  const acceptedCount = fields.filter(f => f.accepted).length;
  const modifiedCount = fields.filter(f => f.modified).length;
  
  const handleConfidenceFilter = (level: 'high' | 'medium' | 'low' | 'all') => {
    setFilterLevel(level);
    onFilterByConfidence(level);
  };

  const handleBulkAcceptByConfidence = (level: 'high' | 'medium' | 'low') => {
    let fieldsToAccept: FieldData[] = [];
    
    switch (level) {
      case 'high':
        fieldsToAccept = highConfidenceFields;
        break;
      case 'medium':
        fieldsToAccept = mediumConfidenceFields;
        break;
      case 'low':
        fieldsToAccept = lowConfidenceFields;
        break;
    }
    
    onBulkAccept(fieldsToAccept.map(f => f.key));
  };

  const handleBulkRejectByConfidence = (level: 'high' | 'medium' | 'low') => {
    let fieldsToReject: FieldData[] = [];
    
    switch (level) {
      case 'high':
        fieldsToReject = highConfidenceFields;
        break;
      case 'medium':
        fieldsToReject = mediumConfidenceFields;
        break;
      case 'low':
        fieldsToReject = lowConfidenceFields;
        break;
    }
    
    onBulkReject(fieldsToReject.map(f => f.key));
  };

  return (
    <Card className={`border-t-4 border-t-blue-500 ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between space-x-4">
          {/* Selection Info & Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedCount === totalFields && totalFields > 0}
                onCheckedChange={(checked) => checked ? onSelectAll() : onSelectNone()}
                aria-label="Select all fields"
              />
              <span className="text-sm font-medium">
                {selectedCount > 0 ? (
                  `${selectedCount} of ${totalFields} selected`
                ) : (
                  `${totalFields} fields total`
                )}
              </span>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Quick Stats */}
            <div className="flex items-center space-x-3 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <CheckSquare className="w-4 h-4 text-green-600" />
                <span>{acceptedCount} accepted</span>
              </div>
              <div className="flex items-center space-x-1">
                <Square className="w-4 h-4 text-blue-600" />
                <span>{modifiedCount} modified</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {/* Confidence-based Quick Actions */}
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                onClick={() => handleBulkAcceptByConfidence('high')}
                disabled={highConfidenceFields.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                Accept High ({highConfidenceFields.length})
              </Button>
              
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkRejectByConfidence('low')}
                disabled={lowConfidenceFields.length === 0}
              >
                <TrendingDown className="w-4 h-4 mr-1" />
                Reject Low ({lowConfidenceFields.length})
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Selected Fields Actions */}
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                onClick={() => onBulkAccept(selectedFields)}
                disabled={selectedCount === 0}
                variant="outline"
                className="border-green-200 text-green-700 hover:bg-green-50"
              >
                Accept Selected
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => onBulkReject(selectedFields)}
                disabled={selectedCount === 0}
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Reject Selected
              </Button>
            </div>

            {/* More Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleConfidenceFilter('all')}>
                  <Filter className="w-4 h-4 mr-2" />
                  Show All Fields
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConfidenceFilter('high')}>
                  <TrendingUp className="w-4 h-4 mr-2 text-green-600" />
                  Show High Confidence Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConfidenceFilter('medium')}>
                  <Minus className="w-4 h-4 mr-2 text-orange-600" />
                  Show Medium Confidence Only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleConfidenceFilter('low')}>
                  <TrendingDown className="w-4 h-4 mr-2 text-red-600" />
                  Show Low Confidence Only
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={() => handleBulkAcceptByConfidence('medium')}>
                  <CheckSquare className="w-4 h-4 mr-2 text-orange-600" />
                  Accept Medium Confidence ({mediumConfidenceFields.length})
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem onClick={onSelectAll}>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select All Fields
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSelectNone}>
                  <Square className="w-4 h-4 mr-2" />
                  Deselect All
                </DropdownMenuItem>
                
                {canUndo && onUndo && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onUndo}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Undo Last Action
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filter Status Display */}
        {filterLevel !== 'all' && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="capitalize">
                Showing {filterLevel} confidence fields only
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleConfidenceFilter('all')}
                className="text-xs"
              >
                Show All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BulkActionBar;