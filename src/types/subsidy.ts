
export interface MultilingualText extends Record<string, string> {
  en: string;
  fr: string;
  es: string;
  ro: string;
}

export interface Subsidy {
  id: string;
  name: string | MultilingualText;
  description: string | MultilingualText;
  matchConfidence: number;
  deadline: string;
  region: string | string[];
  code: string;
  grant: string;
  draftDate?: string;
  status?: string;
  reminder?: string;
  source?: 'search' | 'static';
  isManuallyAdded?: boolean;
  fundingType?: 'public' | 'private' | 'mixed';
  countryEligibility?: string | string[];
  agriculturalSector?: string | string[];
  farmingMethod?: string | string[];
  grantValue?: string;
  certifications?: string[];
}
