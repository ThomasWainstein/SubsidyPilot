import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Upload, 
  Search, 
  Eye, 
  Edit, 
  Save, 
  Download,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  Users,
  Shield
} from 'lucide-react';

const ReviewWorkflowDocs = () => {
  const workflowSteps = [
    {
      step: 1,
      title: 'Document Upload',
      icon: <Upload className="h-5 w-5" />,
      description: 'Upload documents via the farm profile or document management interface',
      actions: ['Choose supported file types', 'Automatic categorization', 'File validation'],
      status: 'automatic'
    },
    {
      step: 2,
      title: 'AI Extraction',
      icon: <RefreshCw className="h-5 w-5" />,
      description: 'System automatically extracts structured data from documents',
      actions: ['Text extraction', 'Field identification', 'Confidence scoring'],
      status: 'automatic'
    },
    {
      step: 3,
      title: 'Review Queue',
      icon: <Search className="h-5 w-5" />,
      description: 'Documents requiring review are prioritized and queued',
      actions: ['Priority assignment', 'Status tracking', 'Batch operations'],
      status: 'automatic'
    },
    {
      step: 4,
      title: 'Human Review',
      icon: <Eye className="h-5 w-5" />,
      description: 'Users review, validate, and correct extracted data',
      actions: ['Field verification', 'Correction input', 'Note addition'],
      status: 'manual'
    },
    {
      step: 5,
      title: 'Approval & Export',
      icon: <Save className="h-5 w-5" />,
      description: 'Finalize corrections and export validated data',
      actions: ['Status updates', 'Data export', 'Audit logging'],
      status: 'manual'
    }
  ];

  const roles = [
    {
      name: 'Farm Owner',
      icon: <Users className="h-5 w-5" />,
      permissions: [
        'Upload documents to own farms',
        'Review and correct extractions',
        'Export own farm data',
        'Re-extract failed documents'
      ],
      restrictions: [
        'Cannot access other farms',
        'Cannot modify system settings'
      ]
    },
    {
      name: 'Consultant',
      icon: <Shield className="h-5 w-5" />,
      permissions: [
        'Review assigned client farms',
        'Bulk operations on client data',
        'Advanced analytics access',
        'Quality monitoring'
      ],
      restrictions: [
        'Limited to assigned clients',
        'Cannot delete audit records'
      ]
    },
    {
      name: 'Administrator',
      icon: <Shield className="h-5 w-5" />,
      permissions: [
        'Full system access',
        'Global analytics and reports',
        'User management',
        'System configuration'
      ],
      restrictions: [
        'Audit trail immutability',
        'Data privacy compliance'
      ]
    }
  ];

  const confidenceLevels = [
    { range: '90-100%', color: 'green', label: 'Excellent', action: 'Auto-approved, minimal review needed' },
    { range: '70-89%', color: 'blue', label: 'Good', action: 'Quick verification recommended' },
    { range: '50-69%', color: 'yellow', label: 'Medium', action: 'Manual review required' },
    { range: '0-49%', color: 'red', label: 'Low', action: 'Detailed review and correction needed' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Document Review Workflow</h2>
        <p className="text-muted-foreground">
          Complete guide to using the document extraction and review system.
        </p>
      </div>

      {/* Workflow Steps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Review Process Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {workflowSteps.map((step, index) => (
              <div key={step.step} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.status === 'automatic' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {step.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">
                      {step.step}. {step.title}
                    </h3>
                    <Badge variant={step.status === 'automatic' ? 'secondary' : 'default'}>
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{step.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {step.actions.map((action, actionIndex) => (
                      <Badge key={actionIndex} variant="outline" className="text-xs">
                        {action}
                      </Badge>
                    ))}
                  </div>
                </div>
                {index < workflowSteps.length - 1 && (
                  <div className="absolute left-5 mt-12 w-px h-8 bg-border" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Confidence Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Understanding Confidence Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Each extracted field receives a confidence score indicating how certain the AI is about the accuracy.
            </p>
            {confidenceLevels.map((level) => (
              <div key={level.range} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-${level.color}-500`} />
                  <div>
                    <h4 className="font-medium">{level.range}</h4>
                    <p className="text-sm text-muted-foreground">{level.label} confidence</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs text-right">
                  {level.action}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Roles and Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Roles & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {roles.map((role) => (
              <div key={role.name} className="space-y-4">
                <div className="flex items-center gap-2">
                  {role.icon}
                  <h3 className="font-semibold">{role.name}</h3>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-green-600 mb-2">Can do:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {role.permissions.map((permission, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {permission}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-red-600 mb-2">Cannot do:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {role.restrictions.map((restriction, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-3 w-3 text-red-500 mt-0.5 flex-shrink-0" />
                        {restriction}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Review Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Always verify critical fields</strong> like legal names, registration numbers, and financial amounts, even with high confidence scores.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-green-600">Do:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Compare extracted data with original document
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Add detailed notes for any corrections
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Use preview feature to view original document
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  Flag documents with persistent issues
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-red-600">Don't:</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  Approve without reviewing low confidence extractions
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  Make corrections without leaving notes
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  Skip verification of automatic approvals
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  Delete or ignore extraction failures
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export and Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Data Export & Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Export reviewed data for use in external systems or regulatory reporting.
          </p>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Available Formats:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>JSON:</strong> Complete data with metadata</li>
                <li>• <strong>CSV:</strong> Tabular format for spreadsheets</li>
                <li>• <strong>Individual:</strong> Single document extractions</li>
                <li>• <strong>Batch:</strong> Multiple documents combined</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">Export Includes:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Original and corrected field values</li>
                <li>• Confidence scores and review status</li>
                <li>• Reviewer notes and timestamps</li>
                <li>• Document metadata and links</li>
              </ul>
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              All exports include full audit trails for compliance and transparency.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewWorkflowDocs;