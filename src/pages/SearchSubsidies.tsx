import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PipelineTestComponent } from '@/components/admin/PipelineTestComponent';

export default function SearchSubsidies() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Pipeline Testing</h1>
        <p className="text-muted-foreground">Test the enhanced FranceAgriMer extraction pipeline</p>
      </div>
      
      <PipelineTestComponent />
    </div>
  );
}