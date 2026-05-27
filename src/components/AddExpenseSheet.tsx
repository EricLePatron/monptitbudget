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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { BudgetConfig, formatCurrencyCompact } from '@/lib/budget';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddExpense: (amount: number, name?: string, category?: string, date?: string) => void;
  categories: ExpenseCategory[];
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
  onAddCategory,
  onDeleteCategory,
  budgetConfig,
  categorySpending = [],
}: AddExpenseSheetProps) {
  const [amount, setAmount] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
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
      onAddExpense(value, name.trim() || undefined, selectedCategory, dateStr);
      setAmount('');
      setName('');
      setSelectedCategory(undefined);
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

        <form onSubmit={handleSubmit} className="space-y-5">
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

          {/* Category Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Catégorie</Label>
            <CategorySelector
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onAddCategory={onAddCategory}
              onDeleteCategory={onDeleteCategory}
            />

            {/* Category budget status indicator */}
            {selectedCatSpending && selectedCatSpending.status !== 'uncapped' && selectedCatSpending.config?.capAmount && (
              <div className={cn(
                'flex items-center gap-2.5 rounded-xl px-3 py-2.5 border text-sm',
                selectedCatSpending.status === 'exceeded'
                  ? 'border-red-500/40 bg-red-500/8'
                  : selectedCatSpending.status === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/8'
                  : 'border-emerald-500/30 bg-emerald-500/5'
              )}>
                {selectedCatSpending.status === 'exceeded' ? (
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                ) : selectedCatSpending.status === 'warning' ? (
                  <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-muted/40 mb-1 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        selectedCatSpending.status === 'exceeded'
                          ? 'bg-red-500'
                          : selectedCatSpending.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      )}
                      style={{ width: `${Math.min(100, selectedCatSpending.percentage ?? 0)}%` }}
                    />
                  </div>
                  <p className={cn(
                    'text-[11px] font-medium tabular-nums',
                    selectedCatSpending.status === 'exceeded'
                      ? 'text-red-400'
                      : selectedCatSpending.status === 'warning'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  )}>
                    {selectedCatSpending.status === 'exceeded'
                      ? `Plafond dépassé de ${formatCurrencyCompact(Math.abs(selectedCatSpending.remaining ?? 0))}`
                      : selectedCatSpending.remaining !== undefined
                      ? `${formatCurrencyCompact(selectedCatSpending.remaining)} restant sur ${formatCurrencyCompact(selectedCatSpending.config.capAmount)}`
                      : ''}
                  </p>
                </div>

                <span className={cn(
                  'shrink-0 text-[11px] font-bold tabular-nums',
                  selectedCatSpending.status === 'exceeded'
                    ? 'text-red-400'
                    : selectedCatSpending.status === 'warning'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                )}>
                  {Math.round(selectedCatSpending.percentage ?? 0)}%
                </span>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-12 justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "EEEE d MMMM yyyy", { locale: fr })
                  ) : budgetConfig && !isTodayInBudgetRange() ? (
                    <span>1er {format(new Date(budgetConfig.year, budgetConfig.month, 1), "MMMM yyyy", { locale: fr })}</span>
                  ) : (
                    <span>Aujourd'hui</span>
                  )}
                </Button>
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
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(undefined)}
                className="text-xs text-muted-foreground"
              >
                Réinitialiser à aujourd'hui
              </Button>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="expense-name" className="text-sm font-medium">
              Nom (optionnel)
            </Label>
            <Input
              id="expense-name"
              type="text"
              placeholder="Ex: Café, Courses, Transport..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12"
              maxLength={50}
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="expense-amount" className="text-sm font-medium">
              Montant
            </Label>
            <div className="relative">
              <Input
                id="expense-amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-center text-4xl font-display font-bold h-20 pr-12"
                min="0.01"
                step="0.01"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-medium">
                €
              </span>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((qa) => (
              <Button
                key={qa}
                type="button"
                variant="secondary"
                className="h-12 text-lg font-medium"
                onClick={() => setAmount(qa.toString())}
              >
                {qa} €
              </Button>
            ))}
          </div>

          {/* Scan Receipt Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 text-base font-medium border-dashed border-2 gap-3"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyse du ticket en cours...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                📸 Scanner un ticket de caisse
              </>
            )}
          </Button>

          {/* Submit */}
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-lg font-medium"
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <Check className="mr-2 w-5 h-5" />
            Ajouter
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
