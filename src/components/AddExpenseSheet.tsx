import { useState, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Check, CalendarIcon, Camera, Loader2, AlertTriangle, TrendingUp } from 'lucide-react';
import { CategorySelector } from './CategorySelector';
import { ExpenseCategory } from '@/hooks/useExpenseCategories';
import { CategorySpending } from '@/hooks/useCategoryBudgets';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BudgetConfig, formatCurrencyCompact } from '@/lib/budget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: (amount: number, name?: string, category?: string, date?: string, subcategory?: string) => void;
  categories: ExpenseCategory[];
  parentCategories: ExpenseCategory[];
  subcategoriesOf: (parentId: string) => ExpenseCategory[];
  onAddCategory: (name: string, emoji: string) => Promise<ExpenseCategory | null>;
  onDeleteCategory?: (categoryId: string) => Promise<void>;
  budgetConfig?: BudgetConfig | null;
  categorySpending?: CategorySpending[];
}

export function AddExpenseSheet({
  open,
  onOpenChange,
  onAddExpense,
  categories,
  parentCategories,
  subcategoriesOf,
  onAddCategory,
  onDeleteCategory,
  budgetConfig,
  categorySpending = [],
}: AddExpenseSheetProps) {
  const [amount, setAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find spending info for the currently selected category
  const selectedCatSpending = selectedCategory
    ? categorySpending.find((s) => s.categoryName === selectedCategory)
    : undefined;

  const handleScanReceipt = async (file: File) => {
    setIsScanning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      if (data.total) setAmount(String(data.total));
      if (data.name) setName(data.name);
      if (data.date) {
        const [y, m, d] = data.date.split('-').map(Number);
        setSelectedDate(new Date(y, m - 1, d));
      }

      toast.success('Ticket scanné avec succès !');
    } catch (err) {
      console.error('Scan error:', err);
      toast.error('Impossible de lire le ticket. Réessayez avec une photo plus nette.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Check if today falls within the budget month range
  const isTodayInBudgetRange = () => {
    if (!budgetConfig) return true;
    const today = new Date();
    const firstDay = new Date(budgetConfig.year, budgetConfig.month, 1);
    const lastDay = new Date(budgetConfig.year, budgetConfig.month + 1, 0);
    return today >= firstDay && today <= lastDay;
  };

  const getDefaultDateStr = () => {
    if (selectedDate) {
      return `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    }
    // If today is outside the budget month, default to 1st of budget month
    if (budgetConfig && !isTodayInBudgetRange()) {
      return `${budgetConfig.year}-${String(budgetConfig.month + 1).padStart(2, '0')}-01`;
    }
    return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (value > 0) {
      const dateStr = getDefaultDateStr();
      onAddExpense(value, name.trim() || undefined, selectedCategory, dateStr, selectedSubcategory);
      setAmount('');
      setName('');
      setSelectedCategory(undefined);
      setSelectedSubcategory(undefined);
      setSelectedDate(undefined);
      onOpenChange(false);
    }
  };

  // Calculate date range for the budget month
  const getDateRange = () => {
    if (!budgetConfig) return { from: undefined, to: undefined };
    const firstDay = new Date(budgetConfig.year, budgetConfig.month, 1);
    const lastDay = new Date(budgetConfig.year, budgetConfig.month + 1, 0);
    return { from: firstDay, to: lastDay };
  };

  const dateRange = getDateRange();

  const quickAmounts = [5, 10, 15, 20, 25, 50];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[90vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display text-xl">
            Ajouter une dépense
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleScanReceipt(file);
            }}
          />

          {/* 1. Amount — first and prominent */}
          <div className="relative">
            <Input
              id="expense-amount"
              type="number"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-center text-5xl font-display font-bold h-24 pr-12 border-2 focus:border-primary"
              min="0.01"
              step="0.01"
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-medium">
              €
            </span>
          </div>

          {/* 2. Quick amounts */}
          <div className="grid grid-cols-6 gap-1.5">
            {quickAmounts.map((qa) => (
              <Button
                key={qa}
                type="button"
                variant="secondary"
                className="h-10 text-sm font-semibold"
                onClick={() => setAmount(qa.toString())}
              >
                {qa}
              </Button>
            ))}
          </div>

          {/* 3. Category */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Catégorie</Label>
            <CategorySelector
              categories={categories}
              parentCategories={parentCategories}
              subcategoriesOf={subcategoriesOf}
              selectedCategory={selectedCategory}
              selectedSubcategory={selectedSubcategory}
              onSelectCategory={(cat, sub) => {
                setSelectedCategory(cat);
                setSelectedSubcategory(sub);
              }}
              onAddCategory={onAddCategory}
              onDeleteCategory={onDeleteCategory}
            />
            {/* Category cap indicator */}
            {selectedCatSpending && selectedCatSpending.status !== 'uncapped' && selectedCatSpending.config?.capAmount && (
              <div className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2 border',
                selectedCatSpending.status === 'exceeded' ? 'border-red-500/40 bg-red-500/8'
                  : selectedCatSpending.status === 'warning' ? 'border-amber-500/40 bg-amber-500/8'
                  : 'border-emerald-500/30 bg-emerald-500/5',
              )}>
                {selectedCatSpending.status === 'exceeded'
                  ? <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  : selectedCatSpending.status === 'warning'
                  ? <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  : <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="h-1 rounded-full bg-muted/40 mb-1 overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', selectedCatSpending.status === 'exceeded' ? 'bg-red-500' : selectedCatSpending.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500')}
                      style={{ width: `${Math.min(100, selectedCatSpending.percentage ?? 0)}%` }}
                    />
                  </div>
                  <p className={cn('text-[10px] font-medium tabular-nums', selectedCatSpending.status === 'exceeded' ? 'text-red-400' : selectedCatSpending.status === 'warning' ? 'text-amber-400' : 'text-emerald-400')}>
                    {selectedCatSpending.status === 'exceeded'
                      ? `Dépassé de ${formatCurrencyCompact(Math.abs(selectedCatSpending.remaining ?? 0))}`
                      : `${formatCurrencyCompact(selectedCatSpending.remaining ?? 0)} restant`}
                  </p>
                </div>
                <span className={cn('shrink-0 text-[10px] font-bold tabular-nums', selectedCatSpending.status === 'exceeded' ? 'text-red-400' : selectedCatSpending.status === 'warning' ? 'text-amber-400' : 'text-emerald-400')}>
                  {Math.round(selectedCatSpending.percentage ?? 0)}%
                </span>
              </div>
            )}
          </div>

          {/* 4. Name — optional */}
          <Input
            id="expense-name"
            type="text"
            placeholder="Nom (optionnel) — Café, Courses…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-11"
            maxLength={50}
          />

          {/* 5. Date — collapsible, defaults to today */}
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'flex items-center gap-2 text-xs font-medium rounded-full px-3 py-1.5 border transition-all',
                    selectedDate
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/50 bg-muted/40 text-muted-foreground hover:border-border',
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {selectedDate
                    ? format(selectedDate, "d MMM yyyy", { locale: fr })
                    : budgetConfig && !isTodayInBudgetRange()
                    ? `1er ${format(new Date(budgetConfig.year, budgetConfig.month, 1), "MMM yyyy", { locale: fr })}`
                    : "Aujourd'hui"}
                  {selectedDate && (
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); setSelectedDate(undefined); }}
                      className="ml-1 hover:text-foreground"
                    >
                      ×
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    if (!dateRange.from || !dateRange.to) return false;
                    return date < dateRange.from || date > dateRange.to;
                  }}
                  defaultMonth={budgetConfig ? new Date(budgetConfig.year, budgetConfig.month) : undefined}
                  locale={fr}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 6. Scan + Submit */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-14 px-4 border-dashed border-2 gap-2 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-14 text-lg font-semibold"
              disabled={!amount || parseFloat(amount) <= 0}
            >
              <Check className="mr-2 w-5 h-5" />
              Ajouter
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
