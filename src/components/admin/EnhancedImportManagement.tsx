import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useImportJobs } from '@/hooks/useImportJobs';
import { CANONICAL_SUBSIDY_FIELDS, FieldMapping } from '@/schemas/importValidation';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Download, History, Book } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { HelpTooltip } from '@/components/ui/help-tooltip';
import { StatusBadge } from '@/components/ui/status-badge';
import { ProgressIndicator } from '@/components/ui/progress-indicator';

const EnhancedImportManagement = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'subsidies' | 'farms' | 'applications'>('subsidies');
  
  const {
    currentJob,
    parsedData,
    sourceFields,
    createImportJob,
    updateFieldMappings,
    validateData,
    executeImport,
    cancelImport,
  } = useImportJobs();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleStartImport = async () => {
    if (!selectedFile) return;
    
    try {
      await createImportJob(selectedFile, importType);
    } catch (error) {
      console.error('Failed to create import job:', error);
    }
  };

  const handleFieldMappingChange = (sourceField: string, canonicalField: string | undefined) => {
    if (!currentJob) return;
    
    const updatedMappings = currentJob.fieldMappings.map(mapping => 
      mapping.sourceField === sourceField 
        ? { ...mapping, canonicalField: canonicalField as any }
        : mapping
    );
    
    updateFieldMappings(updatedMappings);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'completed';
      case 'failed': case 'cancelled': return 'error';
      case 'importing': return 'processing';
      case 'validating': return 'warning';
      default: return 'pending';
    }
  };

  const importSteps = [
    {
      label: 'File Upload',
      status: selectedFile ? 'completed' as const : 'pending' as const,
      description: 'Select and upload your data file'
    },
    {
      label: 'Field Mapping',
      status: currentJob?.status === 'mapping' ? 'processing' as const : 'pending' as const,
      description: 'Map your columns to canonical fields'
    },
    {
      label: 'Validation',
      status: currentJob?.status === 'validating' ? 'processing' as const : 'pending' as const,
      description: 'Validate data integrity and format'
    },
    {
      label: 'Import',
      status: currentJob?.status === 'importing' ? 'processing' as const : 
             currentJob?.status === 'completed' ? 'completed' as const : 'pending' as const,
      description: 'Import validated data to database'
    }
  ];

  const renderFileUpload = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Enhanced Data Import
          <HelpTooltip content="Upload CSV, Excel, or JSON files to import subsidies, farms, or application data into AgriTool." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Progress Indicator */}
        <ProgressIndicator
          steps={importSteps}
          currentStep={currentJob ? 
            (currentJob.status === 'mapping' ? 1 :
             currentJob.status === 'validating' ? 2 :
             currentJob.status === 'importing' ? 3 : 0) : 0}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="import-type" className="flex items-center gap-2">
              Data Type
              <HelpTooltip content="Choose the type of data you're importing to ensure proper validation and processing." />
            </Label>
            <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subsidies">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Subsidies
                  </div>
                </SelectItem>
                <SelectItem value="farms">
                  <div className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Farms
                  </div>
                </SelectItem>
                <SelectItem value="applications">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Applications
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="file-upload" className="flex items-center gap-2">
              File (CSV, Excel, JSON)
              <HelpTooltip content="Supported formats: .csv, .xlsx, .xls, .json. Maximum file size: 50MB." />
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
          </div>
        </div>

        {selectedFile && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span className="font-medium">Selected: {selectedFile.name}</span>
              <Badge variant="outline">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
              <Badge variant="outline">{selectedFile.type || 'Unknown type'}</Badge>
            </div>
          </div>
        )}
        
        <EnhancedButton 
          onClick={handleStartImport} 
          disabled={!selectedFile}
          loading={false}
          loadingText="Parsing file..."
          tooltip="Parse the selected file and prepare for field mapping"
          className="w-full"
          icon={<FileText className="h-4 w-4" />}
        >
          Parse and Preview
        </EnhancedButton>
      </CardContent>
    </Card>
  );

  const renderFieldMapping = () => {
    if (!currentJob || !sourceFields.length) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Field Mapping
            <HelpTooltip content="Map your file columns to the canonical data fields. This ensures data is properly structured in the database." />
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Map your file columns to the canonical data fields ({sourceFields.length} fields detected)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
              <div>Source Field</div>
              <div>Canonical Field</div>
              <div>Preview</div>
            </div>
            
            {sourceFields.map(sourceField => {
              const mapping = currentJob.fieldMappings.find(m => m.sourceField === sourceField);
              const sampleData = parsedData?.[0]?.[sourceField];
              
              return (
                <div key={sourceField} className="grid grid-cols-3 gap-4 items-center py-2 border-b">
                  <div className="font-medium">{sourceField}</div>
                  <div>
                    <Select 
                      value={mapping?.canonicalField || ''} 
                      onValueChange={(value) => handleFieldMappingChange(sourceField, value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Skip this field</SelectItem>
                        {CANONICAL_SUBSIDY_FIELDS.map(field => (
                          <SelectItem key={field} value={field}>
                            {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {sampleData ? String(sampleData).substring(0, 50) + (String(sampleData).length > 50 ? '...' : '') : 'No data'}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <EnhancedButton 
              variant="outline" 
              onClick={cancelImport}
              tooltip="Cancel import and start over"
            >
              Cancel
            </EnhancedButton>
            <EnhancedButton 
              onClick={validateData}
              tooltip="Validate the mapped data before importing"
              icon={<CheckCircle className="h-4 w-4" />}
            >
              Validate Data
            </EnhancedButton>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderValidationResults = () => {
    if (!currentJob || currentJob.status === 'mapping') return null;

    const errorCount = currentJob.validationErrors.filter(e => e.severity === 'error').length;
    const warningCount = currentJob.validationErrors.filter(e => e.severity === 'warning').length;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {errorCount > 0 ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            Validation Results
            <StatusBadge status={errorCount > 0 ? 'error' : 'completed'} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{currentJob.totalRows - errorCount}</div>
              <div className="text-sm text-muted-foreground">Valid Records</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-3xl font-bold text-red-600">{errorCount}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>

          {currentJob.duplicates.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Found {currentJob.duplicates.length} potential duplicates. Review before importing.
              </AlertDescription>
            </Alert>
          )}

          {currentJob.validationErrors.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Issues Found:</h4>
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                {currentJob.validationErrors.slice(0, 20).map((error, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm p-2 bg-muted rounded">
                    <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'}>
                      Row {error.row}
                    </Badge>
                    <div className="flex-1">
                      <span className="font-medium">{error.field}:</span>
                      <span className="text-muted-foreground ml-1">{error.error}</span>
                    </div>
                  </div>
                ))}
                {currentJob.validationErrors.length > 20 && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    ... and {currentJob.validationErrors.length - 20} more issues
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <EnhancedButton 
              variant="outline" 
              onClick={() => navigate(0)}
              tooltip="Start over with a new file"
            >
              Start Over
            </EnhancedButton>
            {errorCount === 0 && (
              <EnhancedButton 
                onClick={() => executeImport.mutate()}
                loading={executeImport.isPending}
                loadingText="Importing..."
                tooltip={`Import ${currentJob.totalRows} validated records to the database`}
                icon={<Upload className="h-4 w-4" />}
              >
                Import {currentJob.totalRows} Records
              </EnhancedButton>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderProgress = () => {
    if (!currentJob || !['importing', 'completed', 'failed'].includes(currentJob.status)) return null;

    const progressPercent = (currentJob.processedRows / currentJob.totalRows) * 100;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusBadge status={getStatusColor(currentJob.status) as any} />
            Import Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{currentJob.processedRows}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{currentJob.successRows}</div>
              <div className="text-sm text-muted-foreground">Success</div>
            </div>
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{currentJob.errorRows}</div>
              <div className="text-sm text-muted-foreground">Errors</div>
            </div>
          </div>

          {currentJob.status === 'completed' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Import completed successfully! {currentJob.successRows} records imported.
              </AlertDescription>
            </Alert>
          )}

          {currentJob.status === 'failed' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Import failed. Please check the error logs and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Enhanced Data Import
            <HelpTooltip content="Import subsidies, farms, and application data from CSV, Excel, or JSON files with advanced validation and mapping." />
          </h2>
          <p className="text-muted-foreground">
            Import data with advanced validation, field mapping, and progress tracking
          </p>
        </div>
        
        <EnhancedButton 
          variant="outline"
          tooltip="Download template files for easy data import"
          icon={<Download className="h-4 w-4" />}
        >
          Download Templates
        </EnhancedButton>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import Data
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Import History
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Book className="h-4 w-4" />
            Templates & Docs
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="import" className="space-y-6">
          {!currentJob && renderFileUpload()}
          {currentJob && currentJob.status === 'mapping' && renderFieldMapping()}
          {currentJob && ['validating', 'reviewing'].includes(currentJob.status) && renderValidationResults()}
          {currentJob && ['importing', 'completed', 'failed'].includes(currentJob.status) && renderProgress()}
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Import History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <LoadingSpinner text="Loading import history..." />
                <p className="text-muted-foreground mt-4">Import history functionality coming soon...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Book className="h-5 w-5" />
                Templates & Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">Download templates and view documentation...</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedImportManagement;