import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Expense } from '@/lib/budget';

export type BudgetType = 'fixed' | 'variable' | 'uncapped';

export interface CategoryBudgetConfig {
  id: string;
  categoryName: string;
  budgetType: BudgetType;
  capAmount?: number;
  warningThreshold: number; // percentage 0-100
  color: string;
  groupName?: string;
  /** NULL = global default (applies to all months without a specific config) */
  month?: number; // 0-11
  year?: number;
}

export type CategoryStatus = 'ok' | 'warning' | 'exceeded' | 'uncapped';

export interface CategorySpending {
  categoryName: string;
  spent: number;
  config?: CategoryBudgetConfig;
  percentage?: number;        // % of cap used (undefined if uncapped)
  status: CategoryStatus;
  remaining?: number;         // remaining before cap (negative = exceeded)
  isOverCap: boolean;
  /** If this entry represents a subcategory, the name of its parent category */
  parentName?: string;
}

export interface CategoryAlert {
  categoryName: string;
  type: 'exceeded' | 'warning';
  spent: number;
  cap: number;
  percentage: number;
  color: string;
  emoji?: string;
}

export const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#3b82f6', // blue
  '#64748b', // slate
];

export const CATEGORY_GROUPS = [
  'Logement',
  'Alimentation',
  'Enfant',
  'Transport',
  'Santé',
  'Médias & Abonnements',
  'Loisirs',
  'Administratif',
  'Autre',
];

export function useCategoryBudgets(
  accountId: string | null,
  expenses: Expense[],
  /** Active month/year — used to resolve per-month configs */
  activeMonth?: number,
  activeYear?: number,
) {
  const [configs, setConfigs] = useState<CategoryBudgetConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConfigs = useCallback(async () => {
    if (!accountId) {
      setConfigs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('category_budget_configs')
        .select('*')
        .eq('account_id', accountId)
        .order('category_name');

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setConfigs((data || []).map((c: any) => ({
        id: c.id,
        categoryName: c.category_name,
        budgetType: c.budget_type as BudgetType,
        capAmount: c.cap_amount != null ? Number(c.cap_amount) : undefined,
        warningThreshold: c.warning_threshold ?? 80,
        color: c.color ?? '#6366f1',
        groupName: c.group_name ?? undefined,
        month: c.month ?? undefined,
        year: c.year ?? undefined,
      })));
    } catch {
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  /**
   * Resolve the effective config for a given category name.
   * Priority: specific month/year > global (NULL month/year).
   */
  const resolveConfig = useCallback((categoryName: string): CategoryBudgetConfig | undefined => {
    const all = configs.filter((c) => c.categoryName === categoryName);
    if (all.length === 0) return undefined;
    // 1. Specific month config
    if (activeMonth !== undefined && activeYear !== undefined) {
      const specific = all.find((c) => c.month === activeMonth && c.year === activeYear);
      if (specific) return specific;
    }
    // 2. Global config (no month/year)
    return all.find((c) => c.month === undefined && c.year === undefined) ?? all[0];
  }, [configs, activeMonth, activeYear]);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  /** Upsert budget config for a category.
   *  Pass month/year to set a monthly override; omit for global default.
   */
  const saveConfig = async (
    categoryName: string,
    updates: Partial<Omit<CategoryBudgetConfig, 'id' | 'categoryName'>>,
    forMonth?: number,
    forYear?: number,
  ) => {
    if (!accountId) return;

    // Find matching existing config (same month/year scope)
    const existing = configs.find((c) =>
      c.categoryName === categoryName &&
      c.month === forMonth &&
      c.year === forYear
    );

    const payload = {
      account_id: accountId,
      category_name: categoryName,
      budget_type: updates.budgetType ?? existing?.budgetType ?? 'uncapped',
      cap_amount:
        updates.capAmount !== undefined ? updates.capAmount : (existing?.capAmount ?? null),
      warning_threshold:
        updates.warningThreshold !== undefined ? updates.warningThreshold : (existing?.warningThreshold ?? 80),
      color: updates.color ?? existing?.color ?? '#6366f1',
      group_name:
        updates.groupName !== undefined ? (updates.groupName || null) : (existing?.groupName ?? null),
      month: forMonth ?? null,
      year: forYear ?? null,
    };

    try {
      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('category_budget_configs')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;

        setConfigs((prev) =>
          prev.map((c) =>
            c.id === existing.id
              ? {
                  id: data.id,
                  categoryName: data.category_name,
                  budgetType: data.budget_type as BudgetType,
                  capAmount:
                    data.cap_amount != null ? Number(data.cap_amount) : undefined,
                  warningThreshold: data.warning_threshold ?? 80,
                  color: data.color ?? '#6366f1',
                  groupName: data.group_name ?? undefined,
                  month: data.month ?? undefined,
                  year: data.year ?? undefined,
                }
              : c
          )
        );
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('category_budget_configs')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;

        setConfigs((prev) => [
          ...prev,
          {
            id: data.id,
            categoryName: data.category_name,
            budgetType: data.budget_type as BudgetType,
            capAmount: data.cap_amount != null ? Number(data.cap_amount) : undefined,
            warningThreshold: data.warning_threshold ?? 80,
            color: data.color ?? '#6366f1',
            groupName: data.group_name ?? undefined,
            month: data.month ?? undefined,
            year: data.year ?? undefined,
          },
        ]);
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde du plafond');
    }
  };

  /** Compute spending per category (and subcategory) using the resolved (month-aware) config.
   *  Pass `subToParent` to also emit subcategory rows (with `parentName` set).
   */
  const getCategorySpending = useCallback(
    (
      categoryEmojis?: Record<string, string>,
      subToParent?: Record<string, string>,
    ): CategorySpending[] => {
      // Aggregate spending by parent category and by subcategory
      const parentSpend: Record<string, number> = {};
      const subSpend: Record<string, number> = {};
      for (const expense of expenses) {
        const cat = expense.category || 'Autre';
        parentSpend[cat] = (parentSpend[cat] || 0) + expense.amount;
        if (expense.subcategory) {
          subSpend[expense.subcategory] = (subSpend[expense.subcategory] || 0) + expense.amount;
        }
      }

      const buildRow = (name: string, spent: number, parentName?: string): CategorySpending => {
        const config = resolveConfig(name);
        if (!config || config.budgetType === 'uncapped' || !config.capAmount) {
          return { categoryName: name, spent, config, status: 'uncapped', isOverCap: false, parentName };
        }
        const percentage = (spent / config.capAmount) * 100;
        const remaining = config.capAmount - spent;
        const isOverCap = spent > config.capAmount;
        const status: CategoryStatus = isOverCap
          ? 'exceeded'
          : percentage >= config.warningThreshold
            ? 'warning'
            : 'ok';
        return { categoryName: name, spent, config, percentage, status, remaining, isOverCap, parentName };
      };

      const cappedConfigNames = configs
        .filter((c) => c.budgetType !== 'uncapped' && c.capAmount)
        .map((c) => c.categoryName);

      // Parent rows: any parent with spend or with a capped config (and not a known sub)
      const parentNames = new Set<string>([
        ...Object.keys(parentSpend),
        ...cappedConfigNames.filter((n) => !subToParent || !subToParent[n]),
      ]);

      // Subcategory rows: only emit if subToParent is provided
      const subNames = new Set<string>();
      if (subToParent) {
        for (const n of Object.keys(subSpend)) subNames.add(n);
        for (const n of cappedConfigNames) {
          if (subToParent[n]) subNames.add(n);
        }
        // Ensure parents of visible subcategories are included so they can be displayed
        for (const n of subNames) {
          const parent = subToParent[n];
          if (parent) parentNames.add(parent);
        }
      }


      const rows: CategorySpending[] = [];
      for (const n of parentNames) rows.push(buildRow(n, parentSpend[n] || 0));
      for (const n of subNames) {
        rows.push(buildRow(n, subSpend[n] || 0, subToParent![n]));
      }

      // Sort: exceeded → warning → ok → uncapped
      const order: Record<CategoryStatus, number> = { exceeded: 0, warning: 1, ok: 2, uncapped: 3 };
      rows.sort((a, b) => order[a.status] - order[b.status]);
      return rows;
    },
    [expenses, configs, resolveConfig]
  );

  /** Categories that need attention */
  const getAlerts = useCallback(
    (categoryEmojis?: Record<string, string>): CategoryAlert[] => {
      return getCategorySpending(categoryEmojis)
        .filter((s) => s.status === 'exceeded' || s.status === 'warning')
        .map((s) => ({
          categoryName: s.categoryName,
          type: s.status as 'exceeded' | 'warning',
          spent: s.spent,
          cap: s.config?.capAmount || 0,
          percentage: s.percentage || 0,
          color: s.config?.color || '#ef4444',
          emoji: categoryEmojis?.[s.categoryName],
        }))
        .sort((a, b) => b.percentage - a.percentage);
    },
    [getCategorySpending]
  );

  return {
    configs,
    loading,
    saveConfig,
    resolveConfig,
    getCategorySpending,
    getAlerts,
    refetch: loadConfigs,
  };
}
