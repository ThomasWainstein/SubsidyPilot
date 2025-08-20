import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { testGoogleVisionAPIKey, getManualTestingChecklist } from '@/utils/immediateValidation';
import { runCriticalPhase1AValidation, DiagnosticResult } from '@/utils/criticalValidation';

export const PhaseValidationDiagnostics = () => {
  const [criticalResults, setCriticalResults] = useState<DiagnosticResult[]>([]);
  const [isCriticalRunning, setIsCriticalRunning] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyTest, setShowApiKeyTest] = useState(false);

  const handleRunCriticalValidation = async () => {
    setIsCriticalRunning(true);
    try {
      const results = await runCriticalPhase1AValidation();
      setCriticalResults(results);
    } catch (error) {
      console.error('Critical validation failed:', error);
      setCriticalResults([{ 
        name: 'System Error', 
        success: false, 
        error: error.message, 
        duration: 0 
      }]);
    } finally {
      setIsCriticalRunning(false);
    }
  };

  const handleTestApiKey = () => {
    if (apiKey.trim()) {
      console.clear();
      testGoogleVisionAPIKey(apiKey);
      setApiKey('');
      setShowApiKeyTest(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🚀 Phase 1A System Validation</CardTitle>
          <CardDescription>
            Comprehensive diagnostics with proper UUID handling and enhanced document fetching
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full max-w-md mx-auto">
            <Button 
              onClick={handleRunCriticalValidation} 
              disabled={isCriticalRunning}
              className="w-full"
              variant="default"
            >
              {isCriticalRunning ? 'Running Diagnostics...' : 'Run Phase 1A Diagnostics'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowApiKeyTest(!showApiKeyTest)}
              className="w-full"
            >
              Test API Key
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                console.clear();
                console.log('📋 PHASE 1A MANUAL TESTING CHECKLIST:');
                getManualTestingChecklist().forEach(item => console.log(item));
              }}
              className="w-full"
            >
              Manual Checklist
            </Button>
          </div>

          {showApiKeyTest && (
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Enter Google Vision API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md"
              />
              <Button onClick={handleTestApiKey}>Test</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {criticalResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">🚀 Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalResults.map((result, index) => (
                <div key={index} className={`p-4 border rounded-lg ${result.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{result.name}</span>
                    <span className={`text-sm px-2 py-1 rounded ${result.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                      {result.success ? '✅ PASS' : '❌ FAIL'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    Duration: {result.duration}ms
                  </div>
                  
                  {result.error && (
                    <div className="text-xs text-red-600 mb-2">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                  
                  {result.data && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                        View Data
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-[10px] overflow-auto max-h-32">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
            
            {criticalResults.filter(r => r.success).length === criticalResults.length && (
              <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">🎉 Phase 1A Critical Tests: ALL PASSED!</h4>
                <p className="text-green-700 text-sm">
                  Your extraction system is now operational with proper UUID handling and enhanced document fetching. 
                  Ready for real French document testing!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};