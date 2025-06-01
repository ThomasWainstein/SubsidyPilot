
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  ExternalLink, 
  Trash2, 
  Calendar,
  Tag
} from 'lucide-react';
import { FarmDocument } from '@/hooks/useFarmDocuments';
import { formatFileSize } from '@/utils/fileValidation';
import { formatDate, getCategoryColor } from '@/utils/documentUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DocumentItemProps {
  document: FarmDocument;
  onDelete: (document: FarmDocument) => void;
  onView: (document: FarmDocument) => void;
  isDeleting?: boolean;
}

const DocumentItem = ({ document, onDelete, onView, isDeleting = false }: DocumentItemProps) => {
  const getDocumentIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="h-6 w-6 text-gray-500" />;
    
    if (mimeType.includes('pdf')) {
      return <FileText className="h-6 w-6 text-red-500" />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
    }
    if (mimeType.includes('image')) {
      return <FileImage className="h-6 w-6 text-blue-500" />;
    }
    return <File className="h-6 w-6 text-gray-500" />;
  };

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border hover:border-gray-300 dark:hover:border-gray-600">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 group-hover:bg-gray-100 dark:group-hover:bg-gray-700 transition-colors">
              {getDocumentIcon(document.mime_type)}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 dark:text-white truncate group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                {document.file_name}
              </h4>
              <div className="flex items-center space-x-3 mt-2">
                <Badge 
                  variant="secondary" 
                  className={`${getCategoryColor(document.category)} text-xs`}
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {document.category}
                </Badge>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {formatDate(document.uploaded_at)}
                </span>
                <span>{formatFileSize(document.file_size || 0)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onView(document)}
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
              aria-label={`View ${document.file_name}`}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 w-8 p-0"
                  aria-label={`Delete ${document.file_name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Document</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{document.file_name}"? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(document)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentItem;
