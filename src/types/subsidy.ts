
export interface Subsidy {
  id: string;
  code: string;
  name: string;
  description: string;
  grant: string;
  region: string | string[];
  matchConfidence: number;
  deadline: string;
  isManuallyAdded?: boolean;
  documentsRequired?: string[];
}

export interface Application {
  id: string;
  farmId: string;
  subsidyId: string;
  subsidyName: string;
  status: 'In Progress' | 'Submitted' | 'Approved';
  submittedDate: string;
  grantAmount: string;
}

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date';
  value: string;
  options?: string[];
}

export interface FormSection {
  id: string;
  title: string;
  fields: FormField[];
}
