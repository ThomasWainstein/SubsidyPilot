import { useState, useEffect } from 'react';

interface FeatureFlags {
  UI_OBSERVABILITY_ENABLED: boolean;
  UI_RESUME_AI_ENABLED: boolean;
  MONITORING_ENABLED: boolean;
}

export const useFeatureFlags = (): FeatureFlags => {
  const [flags, setFlags] = useState<FeatureFlags>({
    UI_OBSERVABILITY_ENABLED: true,
    UI_RESUME_AI_ENABLED: true,
    MONITORING_ENABLED: false,
  });

  useEffect(() => {
    // In a real app, these would come from environment variables or config
    setFlags({
      UI_OBSERVABILITY_ENABLED: import.meta.env.VITE_UI_OBSERVABILITY_ENABLED !== 'false',
      UI_RESUME_AI_ENABLED: import.meta.env.VITE_UI_RESUME_AI_ENABLED !== 'false',
      MONITORING_ENABLED: import.meta.env.VITE_MONITORING_ENABLED === 'true',
    });
  }, []);

  return flags;
};