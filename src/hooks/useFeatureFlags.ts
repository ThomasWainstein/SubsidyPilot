import { useState, useEffect } from 'react';
import { getFeatureFlags, type FeatureFlags } from '@/config/featureFlags';

export const useFeatureFlags = (): FeatureFlags => {
  const [flags, setFlags] = useState<FeatureFlags>(getFeatureFlags());

  useEffect(() => {
    // Load feature flags from static config (no VITE_* dependency)
    setFlags(getFeatureFlags());
  }, []);

  return flags;
};