/**
 * Pattern Extraction Demo Component
 * Demonstrates Phase 1 pattern extraction capabilities
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { getEnhancedPatternExtractor, CountrySpecificResults } from '@/services/enhancedPatternExtractor';
import { ValidationService } from '@/services/validationService';
import { ExtractionResult } from '@/services/patternExtractionService';

export const PatternExtractionDemo: React.FC = () => {
  const [inputText, setInputText] = useState(`
TECH SOLUTIONS SRL
CUI: 18547290
CIF: RO18547290
J40/8302/1997
Email: contact@tech-solutions.ro
Phone: +40 21 123 4567
Website: www.tech-solutions.ro
Turnover: 2.500.000 RON
Employees: 35
IBAN: RO16RZBR6343423217922456
CNP: 1801011234567
  `.trim());

  const [results, setResults] = useState<CountrySpecificResults | null>(null);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const patternService = getEnhancedPatternExtractor();

  const handleExtract = () => {
    setIsProcessing(true);
    setResults(null);

    const startTime = Date.now();
    
    // Simulate a small delay to show the processing state
    setTimeout(() => {
      const extractedResults = patternService.extractPatternsEnhanced(inputText);
      const endTime = Date.now();
      
      setResults(extractedResults);
      setProcessingTime(endTime - startTime);
      setIsProcessing(false);
    }, 100);
  };

  const loadSampleDocument = (type: 'business' | 'financial' | 'mixed' | 'romanian' | 'french_kbis') => {
        const samples = {
          business: `
SOCIÉTÉ GÉNÉRALE CONSTRUCTION SAS
Registration Number: 12345678901234
VAT Number: FR87654321098
SIREN: 987 654 321
Email: info@sgc-construction.fr
Phone: +33 4 56 78 90 12
Website: www.sgc-construction.com
Incorporated: 12/06/2015
Legal Form: SAS
Address: 123 Rue de la Paix, 69000 Lyon, France
          `,
          financial: `
FINANCIAL STATEMENT 2023
Company: INNOVTECH SOLUTIONS SARL
VAT: DE123456789
Turnover: €4,200,000.50
Number of Employees: 87
Balance Sheet Total: €8,750,000
IBAN: DE89370400440532013000
Annual Revenue: 4.2M EUR
Staff Count: 87 people
          `,
          mixed: `
EUROTECH INDUSTRIES S.A.
VAT Number: IT12345678901
Registration: Companies House 87654321
SIREN: 456 789 123
Email: contact@eurotech.it
Phone: +39 02 1234 5678
Website: https://www.eurotech-industries.it
IBAN: IT60X0542811101000000123456
BIC: BPMOIT22XXX

Financial Data 2023:
- Annual Turnover: €15,300,000
- Staff: 156 employees
- Balance Sheet: €28,500,000.75

Incorporation Date: 25/09/2010
Legal Status: Società per Azioni (S.A.)
Headquarters: Milano, Italy 20121
          `,
          romanian: `
REGISTRUL COMERȚULUI - CERTIFICAT DE ÎNREGISTRARE
OFICIUL NAȚIONAL AL REGISTRULUI COMERȚULUI

Denumirea societății: TECH SOLUTIONS SRL
CUI: 18547290
CIF: RO18547290
Numărul de ordine în Registrul Comerţului: J40/8302/1997

Date de contact:
Email: contact@tech-solutions.ro
Telefon: +40 21 123 4567
Site web: www.tech-solutions.ro

Date financiare:
Cifra de afaceri: 2.500.000 RON
Numărul de angajați: 35
IBAN: RO16RZBR6343423217922456

Personal cheie:
Director General - CNP: 1801011234567
          `,
          french_kbis: `
RÉPUBLIQUE FRANÇAISE
GREFFE DU TRIBUNAL DE COMMERCE DE PARIS
REGISTRE DU COMMERCE ET DES SOCIÉTÉS

EXTRAIT K BIS
Code de vérification: ABC123456

Dénomination sociale: INNOVATION STARTUP SAS
SIREN: 712049618
SIRET: 71204961800019
RCS PARIS 712 049 618

N° TVA: FR25712049618
APE: 6201Z (Programmation informatique)

Adresse du siège social:
123 Avenue des Champs-Élysées
75008 Paris, France

IBAN: FR1420041010050500013M02606
Capital social: €150,000
Nombre de salariés: 24
          `
        };
    
    setInputText(samples[type]);
    setResults(null);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800 border-green-200';
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.9) return <CheckCircle className="h-3 w-3" />;
    if (confidence >= 0.7) return <AlertTriangle className="h-3 w-3" />;
    return <AlertTriangle className="h-3 w-3" />;
  };

  const summary = results ? patternService.getExtractionSummary(results) : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle>Phase 1: Pattern Extraction Demo</CardTitle>
            <Badge variant="secondary">Fast & Free</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Test the pattern extraction engine with sample EU business documents. 
            Extracts structured data using regex patterns - no AI needed!
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Sample Document Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleDocument('business')}
            >
              Load Business Registration
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleDocument('financial')}
            >
              Load Financial Statement
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleDocument('mixed')}
            >
              Load Mixed Document
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleDocument('romanian')}
            >
              Load Romanian Document
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadSampleDocument('french_kbis')}
            >
              Load French KBIS
            </Button>
          </div>

          {/* Input Text Area */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Document Text (paste or edit sample)
            </label>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste your document text here..."
              className="min-h-[200px] font-mono text-sm"
            />
          </div>

          {/* Extract Button */}
          <Button 
            onClick={handleExtract}
            disabled={!inputText.trim() || isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Extract Patterns
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Extraction Results
              </CardTitle>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {processingTime}ms
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Summary Stats */}
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{summary.extractedFields}</div>
                  <div className="text-xs text-muted-foreground">Fields Extracted</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{summary.highConfidenceFields}</div>
                  <div className="text-xs text-muted-foreground">High Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{(summary.averageConfidence * 100).toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">Avg Confidence</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{processingTime}ms</div>
                  <div className="text-xs text-muted-foreground">Processing Time</div>
                </div>
              </div>
            )}

            <Separator />

            {/* Extracted Fields */}
            <div className="space-y-3">
              <h4 className="font-medium">Extracted Data Fields:</h4>
              
              {Object.entries(results).map(([fieldName, result]) => {
                if (!result) return null;
                
                const typedResult = result as ExtractionResult;
                
                return (
                  <div key={fieldName} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-sm capitalize">
                        {fieldName.replace(/([A-Z])/g, ' $1').trim()}
                      </div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {String(typedResult.value)}
                      </div>
                      {typedResult.raw && typedResult.raw !== String(typedResult.value) && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Raw: "{typedResult.raw}"
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`${getConfidenceColor(typedResult.confidence)} flex items-center gap-1`}
                        variant="outline"
                      >
                        {getConfidenceIcon(typedResult.confidence)}
                        {(typedResult.confidence * 100).toFixed(0)}%
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {typedResult.source}
                      </Badge>
                    </div>
                  </div>
                );
              })}

              {Object.values(results).filter(Boolean).length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No structured data patterns found in the provided text.
                  Try using one of the sample documents above.
                </div>
              )}
            </div>

            <Separator />

            {/* Benefits Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">Pattern Extraction Benefits:</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• ⚡ Lightning fast processing ({processingTime}ms vs 2-5s for AI)</li>
                <li>• 💰 Zero AI costs for structured data</li>
                <li>• 🎯 100% accurate for known patterns</li>
                <li>• 🔄 Handles multiple EU formats automatically</li>
                <li>• 📊 Perfect for VAT, registration numbers, financial figures</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};