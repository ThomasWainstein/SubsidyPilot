import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Download, 
  FileText, 
  File,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  ExternalLink
} from 'lucide-react';
import { extractDocumentInfo } from '@/utils/documentFormatting';

interface DocumentTableProps {
  documents: any[];
  title?: string;
  showTitle?: boolean;
}

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'pdf':
      return <FileText className="w-4 h-4 text-red-500" />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
    case 'docx':
    case 'doc':
      return <FileText className="w-4 h-4 text-blue-600" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return <FileImage className="w-4 h-4 text-purple-500" />;
    case 'zip':
    case 'rar':
    case '7z':
      return <FileArchive className="w-4 h-4 text-orange-500" />;
    default:
      return <File className="w-4 h-4 text-muted-foreground" />;
  }
};

const getFileTypeBadge = (type: string) => {
  const typeUpper = type.toUpperCase();
  const colors: Record<string, string> = {
    PDF: 'bg-red-100 text-red-800 hover:bg-red-200',
    XLSX: 'bg-green-100 text-green-800 hover:bg-green-200',
    XLS: 'bg-green-100 text-green-800 hover:bg-green-200',
    DOCX: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    DOC: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    CSV: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  };
  
  return (
    <Badge 
      variant="secondary" 
      className={`text-xs font-medium ${colors[typeUpper] || 'bg-muted text-muted-foreground'}`}
    >
      {typeUpper}
    </Badge>
  );
};

export const ModernDocumentTable: React.FC<DocumentTableProps> = ({ 
  documents, 
  title = "Required Documents",
  showTitle = true 
}) => {
  if (!documents || documents.length === 0) {
    return null;
  }

  const processedDocs = documents.map(extractDocumentInfo);

  return (
    <div className="space-y-4">
      {showTitle && (
        <h4 className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-5 h-5" />
          {title}
        </h4>
      )}
      
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Type</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="w-24">Size</TableHead>
                <TableHead className="w-32 text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processedDocs.map((doc, index) => (
                <TableRow key={index} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {getFileIcon(doc.type)}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="font-medium text-sm cursor-help">
                              {doc.displayName}
                              {doc.required && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs text-xs">
                              {doc.originalName}
                              {doc.notes && (
                                <>
                                  <br />
                                  <span className="text-muted-foreground">{doc.notes}</span>
                                </>
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <div className="flex items-center gap-2">
                        {getFileTypeBadge(doc.type)}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-sm text-muted-foreground">
                    {doc.size}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {doc.url && (
                      <Button variant="outline" size="sm" asChild>
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          download
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {processedDocs.map((doc, index) => (
          <div key={index} className="border rounded-lg p-4 bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 mt-1">
                  {getFileIcon(doc.type)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <h5 className="font-medium text-sm leading-tight cursor-help">
                          {doc.displayName}
                        </h5>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">
                          {doc.originalName}
                          {doc.notes && (
                            <>
                              <br />
                              <span className="text-muted-foreground">{doc.notes}</span>
                            </>
                          )}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {getFileTypeBadge(doc.type)}
                    <span className="text-xs text-muted-foreground">{doc.size}</span>
                    {doc.required && (
                      <Badge variant="destructive" className="text-xs">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                {doc.url && (
                  <Button variant="outline" size="sm" asChild>
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      download
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};