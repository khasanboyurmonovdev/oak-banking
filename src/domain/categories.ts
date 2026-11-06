export type CategoryDefinition = {
  id: string;
  label: string;
  /** False for categories that are excluded from income/expense analytics. */
  analytic: boolean;
};

export const CATEGORIES = [
  { id: "customer_payment", label: "Customer payments", analytic: true },
  { id: "processor_payout", label: "Card processor payouts", analytic: true },
  { id: "interest", label: "Interest", analytic: true },
  { id: "payroll", label: "Payroll", analytic: true },
  { id: "rent", label: "Rent", analytic: true },
  { id: "cloud_hosting", label: "Cloud & hosting", analytic: true },
  { id: "software", label: "Software", analytic: true },
  { id: "marketing", label: "Marketing", analytic: true },
  { id: "contractors", label: "Contractors", analytic: true },
  { id: "professional_services", label: "Accounting & legal", analytic: true },
  { id: "insurance", label: "Insurance", analytic: true },
  { id: "utilities", label: "Utilities", analytic: true },
  { id: "travel", label: "Travel", analytic: true },
  { id: "meals", label: "Meals", analytic: true },
  { id: "office", label: "Office & equipment", analytic: true },
  { id: "bank_fees", label: "Bank fees", analytic: true },
  { id: "internal_transfer", label: "Internal transfer", analytic: false },
] as const satisfies readonly CategoryDefinition[];

export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type ExternalCategoryId = Exclude<CategoryId, "internal_transfer">;

export const CATEGORY_IDS: readonly CategoryId[] = CATEGORIES.map((category) => category.id);

export function isCategoryId(value: string): value is CategoryId {
  return CATEGORY_IDS.some((id) => id === value);
}

export function isAnalyticCategory(id: CategoryId): boolean {
  return CATEGORIES.some((category) => category.id === id && category.analytic);
}

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((category) => category.id === id)?.label ?? id;
}
