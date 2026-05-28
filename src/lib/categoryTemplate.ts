/**
 * Default category & subcategory template.
 * - `cap` defined → mandatory cap (budgetType = 'fixed', capAmount = cap)
 * - `cap` undefined → uncapped (variable or prélèvement, no budget tracking)
 */
export interface TemplateSubcategory {
  name: string;
  emoji: string;
  cap?: number;
}

export interface TemplateCategory {
  name: string;
  emoji: string;
  subcategories: TemplateSubcategory[];
}

export const CATEGORY_TEMPLATE: TemplateCategory[] = [
  {
    name: 'Logement',
    emoji: '🏠',
    subcategories: [
      { name: 'Mensualité prêt', emoji: '🏦' },
      { name: 'Assurance prêt', emoji: '🛡️' },
      { name: 'Assurance habitation', emoji: '🏡' },
      { name: 'Eau', emoji: '💧' },
      { name: 'Électricité', emoji: '⚡' },
      { name: 'Gaz', emoji: '🔥' },
      { name: 'Alarme', emoji: '🔔' },
      { name: 'Ménage', emoji: '🧹' },
    ],
  },
  {
    name: 'Enfant',
    emoji: '👶',
    subcategories: [
      { name: 'Cantine', emoji: '🍱' },
      { name: 'Centre de loisirs', emoji: '🎠' },
      { name: 'Shopping enfant', emoji: '👕', cap: 100 },
      { name: 'Pédiatre', emoji: '👨‍⚕️' },
    ],
  },
  {
    name: 'Courses',
    emoji: '🛒',
    subcategories: [
      { name: 'Supermarché', emoji: '🛒', cap: 460 },
      { name: 'Boucherie', emoji: '🥩', cap: 40 },
      { name: 'Boulangerie', emoji: '🥖', cap: 60 },
      { name: 'Pharmacie', emoji: '💊' },
    ],
  },
  {
    name: 'Transport',
    emoji: '🚗',
    subcategories: [
      { name: 'Location voiture', emoji: '🚙' },
      { name: 'Péage', emoji: '🛣️' },
      { name: 'Carburant', emoji: '⛽' },
    ],
  },
  {
    name: 'Médias',
    emoji: '📺',
    subcategories: [
      { name: 'Box internet', emoji: '📡' },
      { name: 'Amazon Prime', emoji: '📦' },
      { name: 'Netflix', emoji: '🎬' },
    ],
  },
  {
    name: 'Plaisirs',
    emoji: '🍝',
    subcategories: [
      { name: 'Restaurants/Deliveroo', emoji: '🍽️', cap: 100 },
      { name: 'Location Vacances/Week-end', emoji: '🏖️' },
    ],
  },
  {
    name: 'Administratif',
    emoji: '🧾',
    subcategories: [
      { name: 'Impôts (taxe foncière)', emoji: '🏛️', cap: 171 },
      { name: 'Frais bancaires', emoji: '🏦' },
    ],
  },
];
