
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DocumentErrorState = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <p className="text-red-600 dark:text-red-400">
            Error loading documents. Please try again.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentErrorState;
