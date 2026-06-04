import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AddExpenseSheet } from './AddExpenseSheet';
import { ExpenseHistorySheet } from './ExpenseHistorySheet';
import { EditExpenseSheet } from './EditExpenseSheet';
import { FullBudgetSetupSheet } from './FullBudgetSetupSheet';
import { ManageAccountsSheet } from './ManageAccountsSheet';
import { AccountMembersSheet } from './AccountMembersSheet';
import { AccountSelector } from './AccountSelector';
import { DonaldSticker } from './DonaldSticker';
import { DailyForecastSheet } from './DailyForecastSheet';
import { CategoryMergedSheet } from './CategoryMergedSheet';
import { SettingsSheet } from './SettingsSheet';
import { PendingTransactionsSheet } from './PendingTransactionsSheet';
import { BankConnectionSheet } from './BankConnectionSheet';
import {
  BudgetConfig,
  Expense,
  Deduction,
  calculateBudgetMetrics,
  getBudgetStatus,
  formatCurrencyCompact,
  getMonthName,
  getTodayKey,
  getExpensesForDay,
} from '@/lib/budget';
import { Account } from '@/hooks/useAccounts';
import { useAccountMembers } from '@/hooks/useAccountMembers';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useCategoryBudgets, CategorySpending } from '@/hooks/useCategoryBudgets';
import { usePendingTransactions } from '@/hooks/usePendingTransactions';
import { Plus, History, ChevronLeft, ChevronRight, Settings, Trash2, TrendingUp, TrendingDown, Minus, Calendar, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface BudgetDashboardProps {
  config: BudgetConfig;
  expenses: Expense[];
  onAddExpense: (amount: number, name?: string, category?: string, date?: string, subcategory?: string) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (
    expenseId: string,
    updates: { amount?: number; name?: string; category?: string; date?: string }
  ) => Promise<void>;
  onUpdateConfig: (config: BudgetConfig) => void;
  accounts: Account[];
  currentAccount: Account | null;
  onSwitchAccount: (accountId: string) => void;
  onCreateAccount: (name: string, emoji: string) => Promise<Account | null>;
  onUpdateAccount: (id: string, name: string, emoji: string) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  previousBudgetSuggestion?: {
    salary?: number;
    deductions?: Deduction[];
    savings?: number;
  } | null;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToCurrentMonth: () => void;
  isCurrentMonth: boolean;
}

// Mini SVG arc gauge for category tiles
function MiniArc({ pct, color, size = 44 }: { pct: number; color: string; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease', filter: `drop-shadow(0 0 3px ${color}88)` }}
      />
    </svg>
  );
}

// Category tile in the 4-column grid
function CategoryTile({
  spending,
  emoji,
  onClick,
}: {
  spending: CategorySpending;
  emoji: string;
  onClick: () => void;
}) {
  const { categoryName, spent, status, percentage = 0, config } = spending;
  const isExceeded = status === 'exceeded';
  const isWarning = status === 'warning';
  const isUncapped = status === 'uncapped';
  const pct = Math.min(100, percentage);
  const arcColor = isExceeded ? '#ef4444' : isWarning ? '#f59e0b' : (config?.color ?? '#10b981');

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-1 rounded-2xl p-2.5 border transition-all active:scale-95',
        isExceeded
          ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_10px_-4px_rgba(239,68,68,0.5)]'
          : isWarning
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border/40 bg-card/60 hover:border-primary/20 hover:bg-card/80',
      )}
    >
      {/* Arc + emoji */}
      <div className="relative flex items-center justify-center" style={{ width: 44, height: 44 }}>
        {!isUncapped && <MiniArc pct={pct} color={arcColor} />}
        {isUncapped && <div className="w-11 h-11 rounded-full border-2 border-border/30" />}
        <span className="absolute text-xl">{emoji}</span>
        {isExceeded && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-[0_0_5px_rgba(239,68,68,0.7)]">
            <span className="text-[8px] text-white font-bold">!</span>
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-[10px] font-semibold text-foreground/80 leading-tight text-center max-w-full truncate w-full">
        {categoryName}
      </p>

      {/* Amount or % */}
      <p className={cn(
        'text-[9px] tabular-nums font-bold leading-none',
        isExceeded ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-muted-foreground',
      )}>
        {isUncapped
          ? formatCurrencyCompact(spent)
          : isExceeded
          ? `+${formatCurrencyCompact(Math.abs(spending.remaining ?? 0))}`
          : `${Math.round(pct)}%`}
      </p>
    </button>
  );
}

export function BudgetDashboard({
  config,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onUpdateExpense,
  onUpdateConfig,
  accounts,
  currentAccount,
  onSwitchAccount,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  previousBudgetSuggestion,
  onPreviousMonth,
  onNextMonth,
  onGoToCurrentMonth,
  isCurrentMonth,
}: BudgetDashboardProps) {
  // Sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingSheetOpen, setPendingSheetOpen] = useState(false);
  const [sharingAccountId, setSharingAccountId] = useState<string | null>(null);
  const [animateAmount, setAnimateAmount] = useState(false);
  const [stickerData, setStickerData] = useState<{ amount: number; name?: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Selected category for merged sheet
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const sharingAccount = accounts.find(a => a.id === sharingAccountId);
  const { members, loading: membersLoading, isOwner, inviteMember, removeMember } =
    useAccountMembers(sharingAccountId, sharingAccount?.name);

  const { categories, parentCategories, subcategoriesOf, addCategory, addSubcategory, updateCategory, deleteCategory } =
    useExpenseCategories(currentAccount?.id ?? null);

  const { pending: pendingTxs, pendingCount, validate: validateTx, ignore: ignoreTx, refetch: refetchPending } =
    usePendingTransactions(currentAccount?.id ?? null);

  const { configs: categoryConfigs, getCategorySpending, saveConfig: saveCategoryConfig } =
    useCategoryBudgets(currentAccount?.id ?? null, expenses);

  const emojiMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.emoji])),
    [categories],
  );

  const categorySpending = useMemo(() => getCategorySpending(emojiMap), [getCategorySpending, emojiMap]);

  const metrics = calculateBudgetMetrics(config, expenses);
  const status = getBudgetStatus(metrics.remainingToday, metrics.dailyBudget);
  const todayExpenses = getExpensesForDay(expenses, getTodayKey());

  const { signOut } = useAuth();

  const handleAddExpense = (amount: number, name?: string, category?: string, date?: string, subcategory?: string) => {
    onAddExpense(amount, name, category, date, subcategory);
    setAnimateAmount(true);
    setTimeout(() => setAnimateAmount(false), 300);
    setStickerData({ amount, name });
  };

  const handleShareAccount = (accountId: string) => {
    setSharingAccountId(accountId);
    setMembersSheetOpen(true);
  };

  const statusConfig = {
    ok:      { textClass: 'text-budget-ok',      glowClass: 'shadow-glow-ok',      barClass: 'bg-gradient-to-r from-budget-ok to-accent',           icon: TrendingUp },
    warning: { textClass: 'text-budget-warning', glowClass: 'shadow-glow-warning', barClass: 'bg-gradient-to-r from-budget-warning to-primary',      icon: Minus },
    danger:  { textClass: 'text-budget-danger',  glowClass: 'shadow-glow-danger',  barClass: 'bg-gradient-to-r from-budget-danger to-budget-danger/70', icon: TrendingDown },
  };
  const currentStatus = statusConfig[status];

  // Category for the merged sheet
  const selectedCategory = selectedCategoryId
    ? parentCategories.find(c => c.id === selectedCategoryId) ?? null
    : null;
  const selectedCategorySpending = selectedCategory
    ? categorySpending.find(s => s.categoryName === selectedCategory.name)
    : undefined;
  const selectedConfig = selectedCategory
    ? categoryConfigs.find(c => c.categoryName === selectedCategory.name) ?? null
    : null;

  // Exceeded alert count
  const exceededCount = categorySpending.filter(s => s.status === 'exceeded').length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* ── Header ── compact, 2 elements only */}
      <header className="px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 flex items-center justify-between gap-3 relative z-10">
        {/* Left: account + month nav */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <AccountSelector
            accounts={accounts}
            currentAccount={currentAccount}
            onSwitch={onSwitchAccount}
            onManage={() => setManageAccountsOpen(true)}
          />
          <div className="flex items-center gap-0.5 bg-secondary/60 rounded-full px-1 py-0.5 w-fit">
            <Button variant="ghost" size="icon" onClick={onPreviousMonth} className="h-7 w-7 rounded-full hover:bg-secondary">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              type="button"
              onClick={() => setEditBudgetOpen(true)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full hover:bg-secondary/80 transition-colors"
            >
              <span className="font-semibold text-sm whitespace-nowrap">{getMonthName(config.month)} {config.year}</span>
              <Settings className="w-3 h-3 text-muted-foreground" />
            </button>
            <Button variant="ghost" size="icon" onClick={onNextMonth} className="h-7 w-7 rounded-full hover:bg-secondary">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={onGoToCurrentMonth}
              className="inline-flex items-center gap-1 h-5 px-2 w-fit text-[10px] rounded-full bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              Aujourd'hui
            </button>
          )}
        </div>

        {/* Right: settings icon (single button) with alert badge */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="h-11 w-11 rounded-full bg-card/70 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 transition-all shadow-sm"
            title="Paramètres"
          >
            <Settings className="w-[18px] h-[18px]" />
          </button>
          {(pendingCount > 0 || exceededCount > 0) && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 flex items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white shadow-[0_0_6px_rgba(239,68,68,0.7)] pointer-events-none">
              {pendingCount + exceededCount > 9 ? '9+' : pendingCount + exceededCount}
            </span>
          )}
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col px-4 pb-2 gap-3 relative overflow-hidden">
        {/* Neon blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 -left-10 w-48 h-48 bg-primary/15 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-10 w-56 h-56 bg-accent/10 rounded-full blur-3xl" />
        </div>

        {/* ── Hero card ── */}
        <div className={cn(
          'relative rounded-3xl border border-white/5 bg-card/80 backdrop-blur-sm px-5 pt-4 pb-5 shadow-lg overflow-hidden animate-fade-in-up',
          currentStatus.glowClass,
        )}>
          {/* Top glow line */}
          <div className={cn(
            'absolute top-0 left-1/2 -translate-x-1/2 w-24 h-[2px] rounded-full blur-sm',
            status === 'ok' ? 'bg-budget-ok' : status === 'warning' ? 'bg-budget-warning' : 'bg-budget-danger',
          )} />

          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 mb-1">
            <Wallet className="w-3 h-3" />
            Reste aujourd'hui
          </p>

          <div className={cn(
            'text-[52px] font-display font-bold leading-none tabular-nums transition-all duration-200',
            currentStatus.textClass,
            animateAmount && 'animate-number-pop',
          )}>
            <span className="drop-shadow-[0_0_16px_currentColor]">{formatCurrencyCompact(metrics.remainingToday)}</span>
          </div>

          <div className="mt-4">
            <div className="h-2 rounded-full bg-background/50 overflow-hidden border border-border/30">
              <div
                className={cn('h-full rounded-full transition-all duration-700 ease-out', currentStatus.barClass)}
                style={{ width: `${Math.max(0, Math.min(100, (metrics.budgetRemaining / config.monthlyBudget) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground/70 font-medium tabular-nums">
              <span>{formatCurrencyCompact(metrics.totalSpentThisMonth)} dépensé</span>
              <button type="button" onClick={() => !metrics.isFutureMonth && setForecastOpen(true)} className="text-primary/70 font-semibold hover:text-primary transition-colors">
                {formatCurrencyCompact(metrics.budgetRemaining)} restant →
              </button>
            </div>
          </div>
        </div>

        {/* ── Category grid ── */}
        {parentCategories.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: '0.08s' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Catégories</p>
              {exceededCount > 0 && (
                <span className="text-[10px] text-red-400 font-semibold">
                  {exceededCount} dépassé{exceededCount > 1 ? 's' : ''} 🚨
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {parentCategories.map((cat) => {
                const s = categorySpending.find(sp => sp.categoryName === cat.name) ?? {
                  categoryName: cat.name,
                  spent: 0,
                  status: 'uncapped' as const,
                  percentage: 0,
                };
                return (
                  <CategoryTile
                    key={cat.id}
                    spending={s}
                    emoji={cat.emoji}
                    onClick={() => setSelectedCategoryId(cat.id)}
                  />
                );
              })}
              {/* Add category tile */}
              <button
                type="button"
                onClick={() => {
                  // Open empty CategoryMergedSheet via a special "add" flow
                  // For now open the first category to show the sheet, or we can show a small inline prompt
                  // We'll handle add via a floating "+" in the sheet list
                }}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-border/40 p-2.5 text-muted-foreground hover:border-primary/30 hover:text-primary transition-all active:scale-95 min-h-[80px]"
              >
                <span className="text-xl">+</span>
                <span className="text-[9px] font-semibold">Ajouter</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Today's expenses ── */}
        {todayExpenses.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden animate-fade-in-up" style={{ animationDelay: '0.12s' }}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Aujourd'hui</p>
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                {todayExpenses.length} achat{todayExpenses.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="divide-y divide-border/40">
              {todayExpenses.slice(-4).map((exp) => (
                <div key={exp.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-xs">{emojiMap[exp.category ?? ''] ?? '💸'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{exp.name || 'Dépense'}</p>
                    {exp.category && (
                      <p className="text-[10px] text-muted-foreground">{exp.category}</p>
                    )}
                  </div>
                  <span className="font-display font-semibold text-sm text-budget-danger tabular-nums shrink-0">
                    -{formatCurrencyCompact(exp.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-budget-danger"
                    onClick={() => onDeleteExpense(exp.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            {todayExpenses.length > 0 && (
              <div className="flex justify-between items-center bg-muted/40 px-4 py-2.5 border-t border-border/40">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
                <span className="font-display font-bold text-sm tabular-nums">{formatCurrencyCompact(metrics.spentToday)}</span>
              </div>
            )}
          </div>
        )}

        <div className="h-20" />
      </main>

      {/* ── Bottom action bar ── */}
      <div className="fixed bottom-[max(env(safe-area-inset-bottom),16px)] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {/* History */}
        <button
          type="button"
          onClick={() => setHistoryOpen(true)}
          className="h-14 w-14 rounded-full bg-card/95 backdrop-blur border border-border shadow-xl text-muted-foreground hover:text-primary hover:bg-card hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          title="Historique"
        >
          <History className="w-5 h-5" />
        </button>

        {/* Add expense — primary CTA */}
        {(metrics.isCurrentMonth || metrics.isFutureMonth) && (
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="h-14 px-6 rounded-full bg-primary text-primary-foreground shadow-xl text-base font-semibold hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter
          </button>
        )}

        {/* Settings */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="h-14 w-14 rounded-full bg-card/95 backdrop-blur border border-border shadow-xl text-muted-foreground hover:text-primary hover:bg-card hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            title="Paramètres"
          >
            <Settings className="w-5 h-5" />
          </button>
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-[0_0_8px_rgba(245,158,11,0.6)] pointer-events-none">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </div>
      </div>

      {/* ── Sheets ── */}
      <AddExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAddExpense={handleAddExpense}
        categories={categories}
        parentCategories={parentCategories}
        subcategoriesOf={subcategoriesOf}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        budgetConfig={config}
        categorySpending={categorySpending}
      />

      <ExpenseHistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        expenses={expenses}
        onDeleteExpense={onDeleteExpense}
        onEditExpense={(exp) => { setHistoryOpen(false); setEditingExpense(exp); }}
        categories={categories}
        budgetConfig={config}
      />

      <EditExpenseSheet
        open={editingExpense !== null}
        onOpenChange={(open) => !open && setEditingExpense(null)}
        expense={editingExpense}
        onUpdateExpense={onUpdateExpense}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        budgetConfig={config}
      />

      <FullBudgetSetupSheet
        open={editBudgetOpen}
        onOpenChange={setEditBudgetOpen}
        currentConfig={config}
        onSave={onUpdateConfig}
        previousBudgetSuggestion={previousBudgetSuggestion}
      />

      <ManageAccountsSheet
        open={manageAccountsOpen}
        onOpenChange={setManageAccountsOpen}
        accounts={accounts}
        onCreate={onCreateAccount}
        onUpdate={onUpdateAccount}
        onDelete={onDeleteAccount}
        onShare={handleShareAccount}
      />

      <AccountMembersSheet
        open={membersSheetOpen}
        onOpenChange={(open) => { setMembersSheetOpen(open); if (!open) setSharingAccountId(null); }}
        accountName={sharingAccount?.name || ''}
        members={members}
        isOwner={isOwner}
        loading={membersLoading}
        onInvite={inviteMember}
        onRemove={removeMember}
      />

      <DailyForecastSheet
        open={forecastOpen}
        onOpenChange={setForecastOpen}
        config={config}
        expenses={expenses}
      />

      <BankConnectionSheet
        open={bankSheetOpen}
        onOpenChange={setBankSheetOpen}
        accountId={currentAccount?.id ?? null}
      />

      <PendingTransactionsSheet
        open={pendingSheetOpen}
        onOpenChange={setPendingSheetOpen}
        pending={pendingTxs}
        categories={categories}
        parentCategories={parentCategories}
        subcategoriesOf={subcategoriesOf}
        onValidate={async (id, cat, sub) => { await validateTx(id, cat, sub); refetchPending(); }}
        onIgnore={async (id) => { await ignoreTx(id); refetchPending(); }}
      />

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        pendingCount={pendingCount}
        onOpenPending={() => setPendingSheetOpen(true)}
        onOpenBudgetConfig={() => setEditBudgetOpen(true)}
        onOpenAccounts={() => setManageAccountsOpen(true)}
        onOpenBank={() => setBankSheetOpen(true)}
        onSignOut={signOut}
      />

      {/* Category merged sheet */}
      {selectedCategory && (
        <CategoryMergedSheet
          open={selectedCategoryId !== null}
          onOpenChange={(o) => { if (!o) setSelectedCategoryId(null); }}
          category={selectedCategory}
          subcategories={subcategoriesOf(selectedCategory.id)}
          spending={selectedCategorySpending}
          config={selectedConfig}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          onAddSubcategory={addSubcategory}
          onSaveConfig={saveCategoryConfig}
        />
      )}

      {stickerData && (
        <DonaldSticker
          amount={stickerData.amount}
          expenseName={stickerData.name}
          onClose={() => setStickerData(null)}
        />
      )}
    </div>
  );
}
