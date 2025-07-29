/**
 * Hook for document classification and comparison with user selection
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { classifyDocumentText, ClassificationResult } from '@/services/documentClassification';
import { toast } from '@/components/ui/use-toast';

export interface ClassificationComparison {
  predicted: ClassificationResult;
  userSelected: string;
  agrees: boolean;
  confidence: number;
}

export const useDocumentClassification = () => {
  const [isClassifying, setIsClassifying] = useState(false);
  const [lastClassification, setLastClassification] = useState<ClassificationResult | null>(null);

  const classifyAndCompare = useCallback(async (
    documentId: string,
    text: string,
    fileName: string,
    userSelectedCategory: string
  ): Promise<ClassificationComparison | null> => {
    try {
      setIsClassifying(true);
      
      console.log(`🔍 Classifying document: ${fileName}`);
      const prediction = await classifyDocumentText(text, fileName);
      setLastClassification(prediction);
      
      const agrees = prediction.category === userSelectedCategory;
      const confidence = prediction.confidence;
      
      console.log(`📊 Classification result:`, {
        predicted: prediction.category,
        userSelected: userSelectedCategory,
        agrees,
        confidence
      });

      // Log the classification comparison for training data
      await logClassificationComparison(
        documentId,
        prediction,
        userSelectedCategory,
        agrees
      );

      // Update the document record with prediction
      await updateDocumentWithPrediction(documentId, prediction, agrees);

      // Show user notification if there's a disagreement
      if (!agrees && confidence > 0.7) {
        toast({
          title: "Category Suggestion",
          description: `Our AI suggests this might be a "${prediction.category}" document (${Math.round(confidence * 100)}% confidence). You selected "${userSelectedCategory}".`,
          duration: 5000,
        });
      }

      return {
        predicted: prediction,
        userSelected: userSelectedCategory,
        agrees,
        confidence
      };

    } catch (error) {
      console.error('❌ Document classification failed:', error);
      toast({
        title: "Classification Error",
        description: "Unable to classify document automatically",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsClassifying(false);
    }
  }, []);

  const logClassificationComparison = async (
    documentId: string,
    prediction: ClassificationResult,
    userSelectedCategory: string,
    agrees: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('document_classification_logs')
        .insert({
          document_id: documentId,
          predicted_category: prediction.category,
          user_selected_category: userSelectedCategory,
          prediction_confidence: prediction.confidence,
          model_used: prediction.model,
          agrees,
        });

      if (error) {
        console.error('Failed to log classification comparison:', error);
      } else {
        console.log('✅ Classification comparison logged successfully');
      }
    } catch (error) {
      console.error('Error logging classification:', error);
    }
  };

  const updateDocumentWithPrediction = async (
    documentId: string,
    prediction: ClassificationResult,
    agrees: boolean
  ) => {
    try {
      const { error } = await supabase
        .from('farm_documents')
        .update({
          predicted_category: prediction.category,
          prediction_confidence: prediction.confidence,
          category_agreement: agrees,
          classification_model: prediction.model,
          classification_timestamp: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (error) {
        console.error('Failed to update document with prediction:', error);
      }
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const getClassificationStats = useCallback(async (farmId: string) => {
    try {
      const { data, error } = await supabase
        .from('document_classification_logs')
        .select(`
          *,
          farm_documents!inner(farm_id)
        `)
        .eq('farm_documents.farm_id', farmId);

      if (error) throw error;

      const total = data.length;
      const agreements = data.filter(log => log.agrees).length;
      const accuracy = total > 0 ? agreements / total : 0;

      return {
        total,
        agreements,
        disagreements: total - agreements,
        accuracy: Math.round(accuracy * 100),
        averageConfidence: data.length > 0 
          ? Math.round(data.reduce((sum, log) => sum + log.prediction_confidence, 0) / data.length * 100)
          : 0
      };
    } catch (error) {
      console.error('Error getting classification stats:', error);
      return null;
    }
  }, []);

  return {
    classifyAndCompare,
    isClassifying,
    lastClassification,
    getClassificationStats,
  };
};