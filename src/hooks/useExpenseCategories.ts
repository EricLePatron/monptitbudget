import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ExpenseCategory {
  id: string;
  name: string;
  emoji: string;
}

const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'id'>[] = [
  { name: 'Supermarché', emoji: '🛒' },
  { name: 'Boulangerie', emoji: '🥖' },
  { name: 'Restaurant', emoji: '🍽️' },
  { name: 'Transport', emoji: '🚌' },
  { name: 'Loisirs', emoji: '🎮' },
  { name: 'Santé', emoji: '💊' },
  { name: 'Shopping', emoji: '🛍️' },
  { name: 'Autre', emoji: '📦' },
];

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
        .select('*')
        .eq('account_id', accountId)
        .order('name');

      if (error) throw error;

      if (data && data.length > 0) {
        setCategories(
          data.map((c) => ({
            id: c.id,
            name: c.name,
            emoji: c.emoji || '📦',
          }))
        );
      } else {
        // Initialize with default categories
        const { data: newCats, error: insertError } = await supabase
          .from('expense_categories')
          .insert(
            DEFAULT_CATEGORIES.map((c) => ({
              account_id: accountId,
              name: c.name,
              emoji: c.emoji,
            }))
          )
          .select();

        if (insertError) throw insertError;

        setCategories(
          (newCats || []).map((c) => ({
            id: c.id,
            name: c.name,
            emoji: c.emoji || '📦',
          }))
        );
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

  const addCategory = async (name: string, emoji: string = '📦') => {
    if (!accountId) return null;

    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .insert({
          account_id: accountId,
          name: name.trim(),
          emoji,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Cette catégorie existe déjà');
        } else {
          throw error;
        }
        return null;
      }

      const newCategory: ExpenseCategory = {
        id: data.id,
        name: data.name,
        emoji: data.emoji || '📦',
      };

      setCategories((prev) => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('Catégorie ajoutée');
      return newCategory;
    } catch {
      toast.error("Erreur lors de l'ajout de la catégorie");
      return null;
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      toast.success('Catégorie supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  return {
    categories,
    loading,
    addCategory,
    deleteCategory,
    refetch: loadCategories,
  };
}
