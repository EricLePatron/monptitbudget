import { ChevronRight } from 'lucide-react';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  /** All categories (parents + subcategories) — kept for legacy compat */
  categories: ExpenseCategory[];
  /** Parent categories only */
  parentCategories: ExpenseCategory[];
  /** Get subcategories for a parent id */
  subcategoriesOf: (parentId: string) => ExpenseCategory[];
  selectedCategory?: string;
  selectedSubcategory?: string;
  onSelectCategory: (category: string | undefined, subcategory?: string) => void;
  /** Legacy compat */
  onAddCategory?: (name: string, emoji: string) => Promise<ExpenseCategory | null>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
}

export function CategorySelector({
  parentCategories,
  subcategoriesOf,
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
}: CategorySelectorProps) {
  // Subcategories panel is auto-expanded for whichever parent is currently selected.
  const expandedParent = parentCategories.find((p) => p.name === selectedCategory);
  const expandedParentId = expandedParent?.id ?? null;

  const handleSelectParent = (name: string) => {
    if (selectedCategory === name) {
      onSelectCategory(undefined, undefined);
      return;
    }
    onSelectCategory(name, undefined);
  };

  return (
    <div className="space-y-2">
      {/* Level 1 — parent categories */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onSelectCategory(undefined, undefined)}
          className={cn(
            'h-8 px-3 rounded-full text-xs font-semibold border transition-all',
            !selectedCategory
              ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]'
              : 'bg-muted text-muted-foreground border-transparent hover:border-border',
          )}
        >
          Aucune
        </button>

        {parentCategories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          const subs = subcategoriesOf(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectParent(cat.name)}
              className={cn(
                'h-8 pl-2 pr-2.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1',
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-transparent hover:border-border hover:text-foreground',
              )}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
              {subs.length > 0 && (
                <ChevronRight className={cn(
                  'w-3 h-3 transition-transform',
                  isSelected && expandedParentId === cat.id ? 'rotate-90 opacity-80' : 'opacity-40',
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Level 2 — subcategories */}
      {expandedParentId && (() => {
        const subs = subcategoriesOf(expandedParentId);
        if (subs.length === 0) return null;
        const parent = parentCategories.find((p) => p.id === expandedParentId);
        return (
          <div className="pl-3 border-l-2 border-primary/30 space-y-1">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
              Sous-catégorie (optionnel)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {subs.map((sub) => {
                const isSubSelected = selectedSubcategory === sub.name;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      if (parent) {
                        onSelectCategory(
                          parent.name,
                          isSubSelected ? undefined : sub.name,
                        );
                      }
                    }}
                    className={cn(
                      'h-7 pl-1.5 pr-2.5 rounded-full text-[11px] font-semibold border transition-all flex items-center gap-1',
                      isSubSelected
                        ? 'bg-primary/15 text-primary border-primary/50'
                        : 'bg-muted/50 text-muted-foreground border-transparent hover:border-border hover:text-foreground',
                    )}
                  >
                    <span>{sub.emoji}</span>
                    <span>{sub.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
