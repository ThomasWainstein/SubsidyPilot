import { DocumentUploadCloudRun } from '@/components/DocumentUploadCloudRun';

export default function CloudRunTest() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent mb-4">
              SubsidyPilot Document Processing
            </h1>
            <p className="text-muted-foreground text-lg">
              Experience real-time AI-powered document analysis with Pattern Extraction + Database Enrichment + Selective AI Processing
            </p>
          </div>
          
          <DocumentUploadCloudRun />
        </div>
      </div>
    </div>
  );
}