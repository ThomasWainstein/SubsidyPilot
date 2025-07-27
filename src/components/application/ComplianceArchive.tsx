import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Download, 
  Lock, 
  Hash, 
  FileText, 
  Calendar, 
  User, 
  Building, 
  CheckCircle, 
  AlertTriangle,
  Database,
  Key,
  Archive,
  Clock,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ArchiveRecord {
  id: string;
  applicationId: string;
  version: number;
  recordType: 'application_data' | 'submission' | 'feedback' | 'status_update' | 'audit_log';
  status: 'draft' | 'sealed' | 'archived' | 'immutable';
  createdAt: Date;
  sealedAt?: Date;
  archivedAt?: Date;
  hash: string;
  previousHash?: string;
  chainPosition: number;
  integrity: 'verified' | 'compromised' | 'unknown';
  metadata: {
    actor: string;
    action: string;
    size: number;
    checksum: string;
    encryption: string;
  };
  data?: any;
}

interface ComplianceReport {
  id: string;
  applicationId: string;
  generatedAt: Date;
  totalRecords: number;
  integrityStatus: 'verified' | 'issues_found' | 'corrupted';
  chainVerified: boolean;
  exportUrl: string;
  certificationHash: string;
}

interface RetentionPolicy {
  recordType: string;
  retentionPeriod: number; // in years
  destructionMethod: string;
  legalRequirement: string;
}

interface ComplianceArchiveProps {
  applicationId: string;
  applicationData: any;
  onComplianceStatus: (isCompliant: boolean) => void;
}

const ComplianceArchive: React.FC<ComplianceArchiveProps> = ({
  applicationId,
  applicationData,
  onComplianceStatus
}) => {
  const { toast } = useToast();
  const [archiveRecords, setArchiveRecords] = useState<ArchiveRecord[]>([]);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [retentionPolicies] = useState<RetentionPolicy[]>([
    {
      recordType: 'application_data',
      retentionPeriod: 7,
      destructionMethod: 'Cryptographic erasure',
      legalRequirement: 'EU GDPR Article 17, National Archive Law'
    },
    {
      recordType: 'submission',
      retentionPeriod: 10,
      destructionMethod: 'Secure deletion',
      legalRequirement: 'Financial audit requirements'
    },
    {
      recordType: 'audit_log',
      retentionPeriod: 10,
      destructionMethod: 'Permanent retention',
      legalRequirement: 'Compliance and accountability laws'
    }
  ]);
  const [isSealing, setIsSealing] = useState(false);
  const [verificationInProgress, setVerificationInProgress] = useState(false);

  useEffect(() => {
    loadArchiveRecords();
    performIntegrityCheck();
  }, [applicationId]);

  const loadArchiveRecords = async () => {
    try {
      // Mock data - in real implementation, this would fetch from immutable storage
      const mockRecords: ArchiveRecord[] = [
        {
          id: 'arch-1',
          applicationId,
          version: 1,
          recordType: 'application_data',
          status: 'immutable',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          sealedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          archivedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          hash: 'SHA256:a1b2c3d4e5f6789012345678901234567890abcdef',
          chainPosition: 1,
          integrity: 'verified',
          metadata: {
            actor: 'system',
            action: 'initial_submission',
            size: 2048576,
            checksum: 'CRC32:8f7e6d5c',
            encryption: 'AES-256-GCM'
          }
        },
        {
          id: 'arch-2',
          applicationId,
          version: 2,
          recordType: 'submission',
          status: 'immutable',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          sealedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          archivedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
          hash: 'SHA256:b2c3d4e5f6789012345678901234567890abcdef12',
          previousHash: 'SHA256:a1b2c3d4e5f6789012345678901234567890abcdef',
          chainPosition: 2,
          integrity: 'verified',
          metadata: {
            actor: 'user:12345',
            action: 'external_submission',
            size: 1024768,
            checksum: 'CRC32:7e6d5c4b',
            encryption: 'AES-256-GCM'
          }
        }
      ];

      setArchiveRecords(mockRecords);
      
      // Check compliance status
      const isCompliant = mockRecords.every(record => 
        record.integrity === 'verified' && record.status === 'immutable'
      );
      onComplianceStatus(isCompliant);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load archive records",
        variant: "destructive"
      });
    }
  };

  const performIntegrityCheck = async () => {
    setVerificationInProgress(true);
    try {
      // Simulate integrity verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockReport: ComplianceReport = {
        id: `report-${Date.now()}`,
        applicationId,
        generatedAt: new Date(),
        totalRecords: archiveRecords.length,
        integrityStatus: 'verified',
        chainVerified: true,
        exportUrl: `/api/compliance/export/${applicationId}`,
        certificationHash: 'SHA256:cert-' + Math.random().toString(36).substr(2, 16)
      };

      setComplianceReport(mockReport);
      
    } catch (error) {
      toast({
        title: "Verification Failed",
        description: "Failed to verify archive integrity",
        variant: "destructive"
      });
    } finally {
      setVerificationInProgress(false);
    }
  };

  const sealRecord = async (recordType: string, data: any) => {
    setIsSealing(true);
    try {
      const newRecord: ArchiveRecord = {
        id: `arch-${Date.now()}`,
        applicationId,
        version: archiveRecords.length + 1,
        recordType: recordType as any,
        status: 'draft',
        createdAt: new Date(),
        hash: generateHash(data),
        previousHash: archiveRecords.length > 0 ? archiveRecords[archiveRecords.length - 1].hash : undefined,
        chainPosition: archiveRecords.length + 1,
        integrity: 'verified',
        metadata: {
          actor: 'user:current',
          action: 'record_creation',
          size: JSON.stringify(data).length,
          checksum: generateChecksum(data),
          encryption: 'AES-256-GCM'
        },
        data
      };

      // Simulate sealing process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      newRecord.status = 'sealed';
      newRecord.sealedAt = new Date();
      
      // Simulate archival process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      newRecord.status = 'immutable';
      newRecord.archivedAt = new Date();

      setArchiveRecords(prev => [...prev, newRecord]);
      
      toast({
        title: "Record Sealed",
        description: "Record has been cryptographically sealed and archived"
      });

    } catch (error) {
      toast({
        title: "Sealing Failed",
        description: "Failed to seal record. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSealing(false);
    }
  };

  const generateHash = (data: any): string => {
    // Mock hash generation - use proper cryptographic hash in production
    const content = JSON.stringify(data);
    return `SHA256:${btoa(content).substr(0, 32)}${Date.now().toString(36)}`;
  };

  const generateChecksum = (data: any): string => {
    // Mock checksum generation
    const content = JSON.stringify(data);
    return `CRC32:${content.length.toString(16)}${Math.random().toString(36).substr(2, 4)}`;
  };

  const exportComplianceReport = async () => {
    try {
      // Generate compliance export
      const exportData = {
        application: applicationData,
        records: archiveRecords,
        report: complianceReport,
        chainOfCustody: generateChainOfCustody(),
        certification: {
          timestamp: new Date(),
          authority: 'AgriTool Compliance System',
          hash: complianceReport?.certificationHash
        }
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-export-${applicationId}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Export Generated",
        description: "Compliance report exported with full chain of custody"
      });

    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to generate compliance export",
        variant: "destructive"
      });
    }
  };

  const generateChainOfCustody = () => {
    return archiveRecords.map(record => ({
      position: record.chainPosition,
      hash: record.hash,
      previousHash: record.previousHash,
      timestamp: record.createdAt,
      actor: record.metadata.actor,
      action: record.metadata.action,
      verified: record.integrity === 'verified'
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'immutable': return 'default';
      case 'sealed': return 'secondary';
      case 'archived': return 'outline';
      case 'draft': return 'destructive';
      default: return 'outline';
    }
  };

  const getIntegrityIcon = (integrity: string) => {
    switch (integrity) {
      case 'verified': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'compromised': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default: return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const overallIntegrity = archiveRecords.every(record => record.integrity === 'verified') && 
                          archiveRecords.every(record => record.status === 'immutable');

  return (
    <div className="space-y-6">
      {/* Compliance Status Alert */}
      <Alert variant={overallIntegrity ? 'default' : 'destructive'}>
        <Shield className="h-4 w-4" />
        <AlertTitle>Compliance Archive Status</AlertTitle>
        <AlertDescription>
          {overallIntegrity 
            ? "All records are cryptographically sealed and verified. Full compliance maintained."
            : "Some records may not be properly sealed or verified. Compliance may be at risk."
          }
        </AlertDescription>
      </Alert>

      {/* Archive Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Archive className="w-5 h-5 mr-2" />
            Archive Overview
          </CardTitle>
          <CardDescription>
            Immutable record storage with cryptographic integrity verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{archiveRecords.length}</div>
              <div className="text-sm text-muted-foreground">Total Records</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {archiveRecords.filter(r => r.status === 'immutable').length}
              </div>
              <div className="text-sm text-muted-foreground">Immutable</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {archiveRecords.filter(r => r.integrity === 'verified').length}
              </div>
              <div className="text-sm text-muted-foreground">Verified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {archiveRecords.reduce((sum, r) => sum + r.metadata.size, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Bytes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Chain */}
      <Card>
        <CardHeader>
          <CardTitle>Cryptographic Chain of Custody</CardTitle>
          <CardDescription>
            Immutable blockchain-style record chain with hash verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          {archiveRecords.length === 0 ? (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Records Archived</h3>
              <p className="text-muted-foreground">Records will appear here when sealed and archived.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {archiveRecords.map((record, index) => (
                <div key={record.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        #{record.chainPosition}
                      </Badge>
                      <span className="font-semibold">{record.recordType.replace('_', ' ')}</span>
                      <Badge variant={getStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                      {getIntegrityIcon(record.integrity)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      v{record.version}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Created:</strong> {record.createdAt.toLocaleString()}</p>
                      {record.sealedAt && (
                        <p><strong>Sealed:</strong> {record.sealedAt.toLocaleString()}</p>
                      )}
                      {record.archivedAt && (
                        <p><strong>Archived:</strong> {record.archivedAt.toLocaleString()}</p>
                      )}
                    </div>
                    <div>
                      <p><strong>Actor:</strong> {record.metadata.actor}</p>
                      <p><strong>Action:</strong> {record.metadata.action}</p>
                      <p><strong>Size:</strong> {record.metadata.size.toLocaleString()} bytes</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Hash className="w-4 h-4" />
                      <span className="font-mono text-xs bg-muted p-1 rounded">
                        {record.hash}
                      </span>
                    </div>
                    {record.previousHash && (
                      <div className="flex items-center space-x-2">
                        <Key className="w-4 h-4" />
                        <span className="font-mono text-xs bg-muted p-1 rounded text-muted-foreground">
                          Prev: {record.previousHash}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Report */}
      {complianceReport && (
        <Card>
          <CardHeader>
            <CardTitle>Compliance Verification Report</CardTitle>
            <CardDescription>
              Latest integrity verification and compliance status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Report Generated</p>
                  <p className="text-sm text-muted-foreground">
                    {complianceReport.generatedAt.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Integrity Status</p>
                  <Badge variant={complianceReport.integrityStatus === 'verified' ? 'default' : 'destructive'}>
                    {complianceReport.integrityStatus}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Chain Verified</p>
                  <p className="text-sm">
                    {complianceReport.chainVerified ? '✓ Verified' : '✗ Failed'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold">Certification Hash</p>
                  <p className="font-mono text-xs bg-muted p-1 rounded">
                    {complianceReport.certificationHash}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button 
                  onClick={exportComplianceReport} 
                  variant="outline" 
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Full Report
                </Button>
                <Button 
                  onClick={performIntegrityCheck} 
                  disabled={verificationInProgress}
                  variant="outline" 
                  size="sm"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {verificationInProgress ? 'Verifying...' : 'Re-verify'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Retention Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Data Retention Policies</CardTitle>
          <CardDescription>
            Legal requirements and retention schedules for different record types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {retentionPolicies.map((policy, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">{policy.recordType.replace('_', ' ')}</span>
                  <Badge variant="outline">{policy.retentionPeriod} years</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  <strong>Destruction:</strong> {policy.destructionMethod}
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>Legal Basis:</strong> {policy.legalRequirement}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual Sealing */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Record Sealing</CardTitle>
          <CardDescription>
            Create new immutable archive records for compliance purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              onClick={() => sealRecord('audit_log', { action: 'manual_seal', timestamp: new Date() })}
              disabled={isSealing}
              variant="outline"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isSealing ? 'Sealing...' : 'Seal Current State'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComplianceArchive;