export const REQUIREMENT_LABELS: Record<string, string> = {
  canteen_menu: 'Menus de la cantine à télécharger',
  business_plan: 'Plan d\'affaires',
  financial_statements: 'États financiers',
  technical_specifications: 'Spécifications techniques',
  project_budget: 'Budget prévisionnel'
};

export function getRequirementLabel(key: any): string {
  // Handle non-string inputs safely
  if (!key) return '';
  
  // Convert to string if it's not already
  const keyStr = typeof key === 'string' ? key : String(key);
  
  // Check if it's a valid string before calling toLowerCase
  if (typeof keyStr !== 'string' || !keyStr.trim()) return '';
  
  const normalized = keyStr.toLowerCase();
  const label = REQUIREMENT_LABELS[normalized];
  if (label) {
    return label;
  }
  // Prettify key: replace underscores/hyphens with spaces and capitalize words
  return keyStr
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
