export const REQUIREMENT_LABELS: Record<string, string> = {
  canteen_menu: 'Menus de la cantine à télécharger',
  business_plan: 'Plan d\'affaires',
  financial_statements: 'États financiers',
  technical_specifications: 'Spécifications techniques',
  project_budget: 'Budget prévisionnel'
};

export function getRequirementLabel(key: string): string {
  if (!key) return '';
  const normalized = key.toLowerCase();
  const label = REQUIREMENT_LABELS[normalized];
  if (label) {
    return label;
  }
  // Prettify key: replace underscores/hyphens with spaces and capitalize words
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
