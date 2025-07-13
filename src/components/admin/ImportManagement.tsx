import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useImportJobs } from '@/hooks/useImportJobs';
import { CANONICAL_SUBSIDY_FIELDS, FieldMapping } from '@/schemas/importValidation';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Download } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ImportManagement = () => {
  const { t } = useLanguage();
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
      case 'completed': return 'bg-green-500';
      case 'failed': case 'cancelled': return 'bg-red-500';
      case 'importing': return 'bg-blue-500';
      case 'validating': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const renderFileUpload = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Import Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="import-type">Data Type</Label>
          <Select value={importType} onValueChange={(value: any) => setImportType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="subsidies">Subsidies</SelectItem>
              <SelectItem value="farms">Farms</SelectItem>
              <SelectItem value="applications">Applications</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="file-upload">File (CSV, Excel, JSON)</Label>
          <Input
            id="file-upload"
            type="file"
            accept=".csv,.xlsx,.xls,.json"
            onChange={handleFileSelect}
          />
          {selectedFile && (
            <div className="text-sm text-muted-foreground">
              Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </div>
          )}
        </div>
        
        <Button 
          onClick={handleStartImport} 
          disabled={!selectedFile}
          className="w-full"
        >
          <FileText className="h-4 w-4 mr-2" />
          Parse and Preview
        </Button>
      </CardContent>
    </Card>
  );

  const renderFieldMapping = () => {
    if (!currentJob || !sourceFields.length) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle>Field Mapping</CardTitle>
          <p className="text-sm text-muted-foreground">
            Map your file columns to the canonical data fields
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sourceFields.map(sourceField => {
              const mapping = currentJob.fieldMappings.find(m => m.sourceField === sourceField);
              return (
                <div key={sourceField} className="flex items-center gap-3">
                  <div className="w-1/3">
                    <Label className="font-medium">{sourceField}</Label>
                  </div>
                  <div className="w-2/3">
                    <Select 
                      value={mapping?.canonicalField || ''} 
                      onValueChange={(value) => handleFieldMappingChange(sourceField, value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select canonical field" />
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
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={cancelImport}>
              Cancel
            </Button>
            <Button onClick={validateData}>
              Validate Data
            </Button>
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
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{currentJob.totalRows - errorCount}</div>
              <div className="text-sm text-muted-foreground">Valid Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{errorCount}</div>
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
            <div className="space-y-2">
              <h4 className="font-medium">Issues Found:</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {currentJob.validationErrors.slice(0, 20).map((error, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'}>
                      Row {error.row}
                    </Badge>
                    <span className="font-medium">{error.field}:</span>
                    <span className="text-muted-foreground">{error.error}</span>
                  </div>
                ))}
                {currentJob.validationErrors.length > 20 && (
                  <div className="text-sm text-muted-foreground">
                    ... and {currentJob.validationErrors.length - 20} more issues
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Start Over
            </Button>
            {errorCount === 0 && (
              <Button onClick={() => executeImport.mutate()}>
                Import {currentJob.totalRows} Records
              </Button>
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
            <div className={`w-3 h-3 rounded-full ${getStatusColor(currentJob.status)}`} />
            Import Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progressPercent} className="w-full" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold">{currentJob.processedRows}</div>
              <div className="text-sm text-muted-foreground">Processed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{currentJob.successRows}</div>
              <div className="text-sm text-muted-foreground">Success</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{currentJob.errorRows}</div>
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
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Data Import</h2>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download Templates
        </Button>
      </div>

      <Tabs defaultValue="import" className="w-full">
        <TabsList>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
          <TabsTrigger value="templates">Templates & Docs</TabsTrigger>
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
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Import history functionality coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Templates & Documentation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Download templates and view documentation...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportManagement;