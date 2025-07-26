
export interface MultilingualText extends Record<string, string> {
  en: string;
  fr: string;
  es: string;
  ro: string;
  pl: string;
}

export interface Subsidy {
  id: string;
  title: string | null;
  description: string | null;
  matchConfidence: number;
  deadline: string | null;
  region: string | null;
  sector: string | null;
  funding_type: string | null;
  amount: number | null;
  url: string | null;
  agency: string | null;
  eligibility: string | null;
  program: string | null;
  created_at?: string;
  // Legacy fields for backward compatibility
  categories?: string[];
  amount_min?: number;
  amount_max?: number;
}
