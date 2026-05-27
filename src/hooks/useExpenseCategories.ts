import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
  parentId?: string;
  sortOrder: number;
}

/** Flat list pre-seeded on first use (parent categories only) */
const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'id' | 'sortOrder'>[] = [
  { name: 'Logement',                emoji: '🏠' },
  { name: 'Courses',                  emoji: '🛒' },
  { name: 'Enfant',                   emoji: '👶' },
  { name: 'Transport',                emoji: '🚗' },
  { name: 'Médias & Abonnements',     emoji: '📺' },
  { name: 'Plaisirs',                 emoji: '🍝' },
  { name: 'Administratif',            emoji: '🧾' },
  { name: 'Autre',                    emoji: '📦' },
];

/** Sub-categories pre-seeded, keyed by parent name */
const DEFAULT_SUBCATEGORIES: Record<string, Omit<ExpenseCategory, 'id' | 'sortOrder' | 'parentId'>[]> = {
  Logement: [
    { name: 'Mensualité prêt',    emoji: '🏦' },
    { name: 'Assurance prêt',     emoji: '🛡️' },
    { name: 'Assurance habitation', emoji: '🏡' },
    { name: 'Eau',                emoji: '💧' },
    { name: 'Électricité',        emoji: '⚡' },
    { name: 'Gaz',                emoji: '🔥' },
    { name: 'Alarme',             emoji: '🔔' },
    { name: 'Ménage',             emoji: '🧹' },
  ],
  Courses: [
    { name: 'Supermarché',   emoji: '🛒' },
    { name: 'Boucherie',     emoji: '🥩' },
    { name: 'Boulangerie',   emoji: '🥖' },
    { name: 'Pharmacie',     emoji: '💊' },
  ],
  Enfant: [
    { name: 'Cantine',          emoji: '🍱' },
    { name: 'Centre de loisirs', emoji: '🎠' },
    { name: 'Shopping enfant',  emoji: '👕' },
    { name: 'Pédiatre',         emoji: '👨‍⚕️' },
  ],
  Transport: [
    { name: 'Location voiture', emoji: '🚙' },
    { name: 'Carburant',        emoji: '⛽' },
    { name: 'Péage',            emoji: '🛣️' },
  ],
  'Médias & Abonnements': [
    { name: 'Box internet',  emoji: '📡' },
    { name: 'Netflix',       emoji: '🎬' },
    { name: 'Amazon Prime',  emoji: '📦' },
  ],
  Plaisirs: [
    { name: 'Restaurant',           emoji: '🍽️' },
    { name: 'Vacances / Week-end',  emoji: '🏖️' },
  ],
  Administratif: [
    { name: 'Impôts / Taxe foncière', emoji: '🏛️' },
    { name: 'Frais bancaires',        emoji: '🏦' },
  ],
};

export function useExpenseCategories(accountId: string | null) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    if (!accountId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expense_categories')
        .select('id, name, emoji, parent_id, sort_order')
        .eq('account_id', accountId)
        .order('sort_order')
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            emoji: c.emoji || '📦',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parentId: (c as any).parent_id ?? undefined,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            sortOrder: (c as any).sort_order ?? 0,
          }))
        );
      } else {
        // Seed default categories + subcategories
        const parentRows = DEFAULT_CATEGORIES.map((c, i) => ({
          account_id: accountId,
          name: c.name,
          emoji: c.emoji,
          sort_order: i,
        }));

        const { data: newParents, error: parentErr } = await supabase
          .from('expense_categories')
          .insert(parentRows)
          .select();

        if (parentErr) throw parentErr;

        const all: ExpenseCategory[] = (newParents || []).map((c, i) => ({
          id: c.id,
          name: c.name,
          emoji: c.emoji || '📦',
          sortOrder: i,
        }));

        // Insert subcategories
        const subRows: object[] = [];
        for (const parent of newParents || []) {
          const subs = DEFAULT_SUBCATEGORIES[parent.name] || [];
          subs.forEach((s, i) => {
            subRows.push({
              account_id: accountId,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              parent_id: parent.id,
              name: s.name,
              emoji: s.emoji,
              sort_order: i,
            });
          });
        }

        if (subRows.length > 0) {
          const { data: newSubs } = await supabase
            .from('expense_categories')
            .insert(subRows as never)
            .select();

          for (const s of newSubs || []) {
            all.push({
              id: s.id,
              name: s.name,
              emoji: s.emoji || '📦',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              parentId: (s as any).parent_id ?? undefined,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              sortOrder: (s as any).sort_order ?? 0,
            });
          }
        }

        setCategories(all);
      }
    } catch {
      toast.error('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // ── Derived helpers ──────────────────────────────────────────────────────

  /** Top-level categories only */
  const parentCategories = categories.filter((c) => !c.parentId);

  /** Subcategories for a given parent id */
  const subcategoriesOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder);

  /** Find a category by name */
  const findByName = (name: string) => categories.find((c) => c.name === name);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  /** Add a top-level category */
  const addCategory = async (name: string, emoji = '📦'): Promise<ExpenseCategory | null> => {
    if (!accountId) return null;
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({ account_id: accountId, name: name.trim(), emoji, sort_order: parentCategories.length })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') toast.error('Cette catégorie existe déjà');
        else throw error;
        return null;
      }

      const newCat: ExpenseCategory = { id: data.id, name: data.name, emoji: data.emoji || '📦', sortOrder: 0 };
      setCategories((prev) => [...prev, newCat]);
      toast.success('Catégorie créée');
      return newCat;
    } catch {
      toast.error("Erreur lors de l'ajout");
      return null;
    }
  };

  /** Add a subcategory under a parent */
  const addSubcategory = async (parentId: string, name: string, emoji = '📦'): Promise<ExpenseCategory | null> => {
    if (!accountId) return null;
    const existingSubs = subcategoriesOf(parentId);
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          account_id: accountId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          parent_id: parentId as any,
          name: name.trim(),
          emoji,
          sort_order: existingSubs.length,
        } as never)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') toast.error('Cette sous-catégorie existe déjà');
        else throw error;
        return null;
      }

      const newCat: ExpenseCategory = {
        id: data.id,
        name: data.name,
        emoji: data.emoji || '📦',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parentId: (data as any).parent_id ?? undefined,
        sortOrder: existingSubs.length,
      };
      setCategories((prev) => [...prev, newCat]);
      return newCat;
    } catch {
      toast.error("Erreur lors de l'ajout de la sous-catégorie");
      return null;
    }
  };

  /** Update a category's name/emoji */
  const updateCategory = async (id: string, name: string, emoji: string) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ name: name.trim(), emoji })
        .eq('id', id);
      if (error) throw error;
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: name.trim(), emoji } : c))
      );
    } catch {
      toast.error('Erreur lors de la modification');
    }
  };

  /** Delete a category (and its subcategories via CASCADE) */
  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from('expense_categories').delete().eq('id', id);
      if (error) throw error;
      // Remove category + all its children
      setCategories((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
      toast.success('Catégorie supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    categories,
    parentCategories,
    subcategoriesOf,
    findByName,
    loading,
    addCategory,
    addSubcategory,
    updateCategory,
    deleteCategory,
    refetch: loadCategories,
  };
}
