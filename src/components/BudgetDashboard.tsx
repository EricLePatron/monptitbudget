import { useState, useMemo, useEffect } from 'react';
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
import { SavingsSheet } from './SavingsSheet';

import { CategoryBudgetsOverview } from './CategoryBudgetsOverview';
import { CategoryTreeManagerSheet } from './CategoryTreeManagerSheet';
import { PendingTransactionsSheet } from './PendingTransactionsSheet';
import { RecurringDebitsCalendarSheet } from './RecurringDebitsCalendarSheet';
import {
  BudgetConfig,
  Expense,
  Deduction,
  calculateBudgetMetrics,
  
  formatCurrencyCompact,
  getMonthName,
} from '@/lib/budget';
import { Account } from '@/hooks/useAccounts';
import { useAccountMembers } from '@/hooks/useAccountMembers';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useCategoryBudgets } from '@/hooks/useCategoryBudgets';
import { usePendingTransactions } from '@/hooks/usePendingTransactions';
import { useAutoRecurringDebits } from '@/hooks/useAutoRecurringDebits';
import { Plus, ChevronLeft, ChevronRight, Calendar, Inbox } from 'lucide-react';
import { BankConnectionSheet } from './BankConnectionSheet';
import { SettingsSheet } from './SettingsSheet';
import { BottomNavBar, NavTab } from './BottomNavBar';
import { CategoryPieChart } from './CategoryPieChart';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
interface BudgetDashboardProps {
  config: BudgetConfig;
  expenses: Expense[];
  projectedExpenses?: Expense[];
  onAddExpense: (amount: number, name?: string, category?: string, date?: string, subcategory?: string, isDirectDebit?: boolean) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (
    expenseId: string,
    updates: { amount?: number; name?: string; category?: string; subcategory?: string; date?: string; isDirectDebit?: boolean }
  ) => Promise<void>;
  onUpdateConfig: (config: BudgetConfig) => void;
  // Account management
  accounts: Account[];
  currentAccount: Account | null;
  onSwitchAccount: (accountId: string) => void;
  onCreateAccount: (name: string, emoji: string) => Promise<Account | null>;
  onUpdateAccount: (id: string, name: string, emoji: string) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  // Budget suggestions
  previousBudgetSuggestion?: {
    salary?: number;
    deductions?: Deduction[];
    savings?: number;
  } | null;
  // Month navigation
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onGoToCurrentMonth: () => void;
  isCurrentMonth: boolean;
}

export function BudgetDashboard({
  config,
  expenses,
  projectedExpenses = [],
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);
  const [membersSheetOpen, setMembersSheetOpen] = useState(false);
  const [forecastOpen, setForecastOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [bankSheetOpen, setBankSheetOpen] = useState(false);
  const [sharingAccountId, setSharingAccountId] = useState<string | null>(null);
  
  const [stickerData, setStickerData] = useState<{ amount: number; name?: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [pendingSheetOpen, setPendingSheetOpen] = useState(false);
  const [treeManagerOpen, setTreeManagerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recurringDebitsOpen, setRecurringDebitsOpen] = useState(false);

  // Bottom nav "active tab" — purely visual since destinations are Sheets,
  // not routes. Defaults back to "home" whenever the corresponding Sheet closes.
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  const handleHistoryOpenChange = (open: boolean) => {
    setHistoryOpen(open);
    if (!open) {
      setHistoryInitialCategory(null);
      setHistoryInitialSubcategory(null);
      setActiveTab('home');
    }
  };

  // Whether one of the sub-sheets reachable from the "Réglages" hub is
  // currently open.
  const settingsChildOpen =
    editBudgetOpen ||
    manageAccountsOpen ||
    bankSheetOpen ||
    savingsOpen ||
    overviewOpen ||
    treeManagerOpen ||
    pendingSheetOpen ||
    recurringDebitsOpen;

  // SettingsSheet closes itself (open=false) then, 150ms later, opens the
  // chosen sub-sheet (see handle() in SettingsSheet.tsx) — this delay avoids
  // two Radix Sheets being mounted at the same time. During that gap no
  // sheet is open at all, so resetting `activeTab` to 'home' synchronously
  // made the bottom nav flash back to "Accueil" (and briefly show the FAB
  // again) before the sub-sheet appeared. Instead, wait a bit longer than
  // that 150ms delay before falling back to "Accueil", and skip the reset
  // entirely if a sub-sheet did open in the meantime.
  useEffect(() => {
    if (settingsOpen || settingsChildOpen) return;
    const timer = setTimeout(() => {
      setActiveTab((prev) => (prev === 'settings' ? 'home' : prev));
    }, 200);
    return () => clearTimeout(timer);
  }, [settingsOpen, settingsChildOpen]);

  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'history') setHistoryOpen(true);
    if (tab === 'settings') setSettingsOpen(true);
    // 'home' has no Sheet to open — it just resets the visual state.
  };

  const sharingAccount = accounts.find(a => a.id === sharingAccountId);

  // Get account members for the sharing account
  const {
    members,
    loading: membersLoading,
    isOwner,
    inviteMember,
    removeMember,
    resendInvitation,
  } = useAccountMembers(sharingAccountId, sharingAccount?.name);

  // Get expense categories (with subcategory support)
  const {
    categories,
    parentCategories,
    subcategoriesOf,
    addCategory,
    deleteCategory,
    refetch: refetchCategories,
  } = useExpenseCategories(currentAccount?.id ?? null);

  // Pending DSP2 transactions
  const {
    pending: pendingTxs,
    pendingCount,
    validate: validateTx,
    ignore: ignoreTx,
    refetch: refetchPending,
  } = usePendingTransactions(currentAccount?.id ?? null);

  // Category budget configs
  const {
    configs: categoryConfigs,
    getCategorySpending,
    getAlerts,
    saveConfig: saveCategoryConfig,
  } = useCategoryBudgets(currentAccount?.id ?? null, expenses);

  // Auto-project recurring direct debits onto the displayed month
  useAutoRecurringDebits(currentAccount?.id ?? null, config.year, config.month);

  // Emoji map for alerts
  const emojiMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.emoji])),
    [categories]
  );

  // Map subcategory name → parent category name (used to nest subcat caps under their parent)
  const subToParent = useMemo(() => {
    const idToName: Record<string, string> = {};
    for (const c of categories) idToName[c.id] = c.name;
    const map: Record<string, string> = {};
    for (const c of categories) {
      if (c.parentId && idToName[c.parentId]) {
        map[c.name] = idToName[c.parentId];
      }
    }
    return map;
  }, [categories]);

  const categorySpending = useMemo(
    () => getCategorySpending(emojiMap, subToParent),
    [getCategorySpending, emojiMap, subToParent]
  );

  const alerts = useMemo(
    () => getAlerts(emojiMap),
    [getAlerts, emojiMap]
  );

  const handleShareAccount = (accountId: string) => {
    setSharingAccountId(accountId);
    setMembersSheetOpen(true);
  };

  const metrics = calculateBudgetMetrics(config, expenses);

  const handleAddExpense = (amount: number, name?: string, category?: string, date?: string, subcategory?: string, isDirectDebit?: boolean) => {
    onAddExpense(amount, name, category, date, subcategory, isDirectDebit);
    setStickerData({ amount, name });
  };

  const [historyInitialCategory, setHistoryInitialCategory] = useState<string | null>(null);
  const [historyInitialSubcategory, setHistoryInitialSubcategory] = useState<string | null>(null);
  const openHistoryForCategory = (cat: string, sub?: string) => {
    setHistoryInitialCategory(cat);
    setHistoryInitialSubcategory(sub ?? null);
    setHistoryOpen(true);
    setActiveTab('history');
  };

  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — compact mobile-first */}
      <header className="px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 relative z-10">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Account Selector */}
          <AccountSelector
            accounts={accounts}
            currentAccount={currentAccount}
            onSwitch={onSwitchAccount}
            onManage={() => setManageAccountsOpen(true)}
          />

          {/* Month Navigation */}
          <div className="flex items-center gap-0.5 bg-card/80 border border-border/60 rounded-full px-1 py-0.5 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPreviousMonth}
              className="h-7 w-7 rounded-full text-foreground hover:bg-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-semibold text-sm text-foreground whitespace-nowrap px-2">
              {getMonthName(config.month)} {config.year}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onNextMonth}
              className="h-7 w-7 rounded-full text-foreground hover:bg-secondary"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Pending transactions to categorize */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setPendingSheetOpen(true)}
            className={cn(
              'relative h-9 w-9 rounded-full border shadow-sm transition-all',
              pendingCount > 0
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-500 hover:bg-amber-500/25 animate-pulse shadow-[0_0_14px_rgba(245,158,11,0.55)]'
                : 'bg-card/80 border-border/60 text-foreground hover:bg-card',
            )}
            title="Transactions à catégoriser"
            aria-label="Transactions à catégoriser"
          >
            <Inbox className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(245,158,11,0.8)]">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 pl-1 mt-1.5">
          <p className="text-[11px] text-muted-foreground font-medium">
            {formatCurrencyCompact(config.monthlyBudget)} / mois
          </p>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={onGoToCurrentMonth}
              className="inline-flex items-center gap-1 h-5 px-2 text-[10px] rounded-full bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              Aujourd'hui
            </button>
          )}
        </div>
      </header>

      {/* Main Content — focus: budget restant + dépenses par catégorie */}
      <main className="flex-1 flex flex-col items-center px-4 pt-2 pb-2 relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 -left-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 -right-10 w-56 h-56 bg-accent/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        </div>


        {/* Budget mensuel — barre discrète */}
        <div className="w-full max-w-sm relative z-10 animate-fade-in-up mb-3 mt-2 px-1">
          <div className="flex items-baseline justify-between mb-1.5">
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                "text-base font-display font-bold tabular-nums leading-none",
                metrics.budgetRemaining < 0 ? "text-destructive" : "text-foreground"
              )}>
                {formatCurrencyCompact(metrics.budgetRemaining)}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                restant
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              / {formatCurrencyCompact(config.monthlyBudget)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                metrics.budgetRemaining < 0
                  ? "bg-gradient-to-r from-destructive/80 to-destructive"
                  : "bg-gradient-to-r from-primary/70 to-primary"
              )}
              style={{
                width: `${Math.min(100, Math.max(0, (1 - metrics.budgetRemaining / Math.max(config.monthlyBudget, 1)) * 100))}%`,
              }}
            />
          </div>
        </div>

        {/* Catégories & plafonds — vue unifiée */}
        <div className="w-full max-w-sm relative z-10 animate-fade-in-up mb-4" style={{ animationDelay: '0.08s' }}>
          <CategoryPieChart
            categorySpending={categorySpending}
            emojiMap={emojiMap}
            onCategoryClick={openHistoryForCategory}
            onManageCaps={() => setOverviewOpen(true)}
          />
        </div>




        {/* Spacer so content can scroll clear of the fixed nav bar + FAB */}
        <div className="h-[calc(4rem+max(env(safe-area-inset-bottom),8px)+72px)]" />
      </main>

      {/* PWA-style bottom tab bar — Accueil / Historique / Prélèvements / Réglages */}
      <BottomNavBar activeTab={activeTab} onNavigate={handleNavigate} alertsCount={alerts.length} />

      {/* Floating "+" — add expense. Home tab only, and only for the current/future month. */}
      {activeTab === 'home' && (metrics.isCurrentMonth || metrics.isFutureMonth) && (
        <div
          className="fixed z-40 inset-x-0 bottom-[calc(4rem+max(env(safe-area-inset-bottom),8px)-14px)] flex justify-center pointer-events-none"
        >
          <Button
            size="icon"
            onClick={() => setSheetOpen(true)}
            className="pointer-events-auto h-16 w-16 rounded-full shadow-xl text-2xl font-bold border-4 border-background"
            title="Ajouter une dépense"
            aria-label="Ajouter une dépense"
          >
            <Plus className="w-7 h-7" />
          </Button>
        </div>
      )}

      {/* Add Expense Sheet */}
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

      {/* Daily Forecast Sheet */}
      <DailyForecastSheet
        open={forecastOpen}
        onOpenChange={setForecastOpen}
        config={config}
        expenses={expenses}
      />

      {/* Expense History Sheet */}
      <ExpenseHistorySheet
        open={historyOpen}
        onOpenChange={handleHistoryOpenChange}
        expenses={expenses}
        onDeleteExpense={onDeleteExpense}
        onEditExpense={(exp) => {
          setHistoryOpen(false);
          // Reset the category/subcategory filter the same way
          // handleHistoryOpenChange(false) would, so that re-opening the
          // history from the nav bar later shows the full list again
          // instead of staying stuck on whatever category was used to open
          // it here. Don't route through handleHistoryOpenChange itself:
          // it also resets `activeTab` to 'home', which would change which
          // nav tab is highlighted while EditExpenseSheet is open.
          setHistoryInitialCategory(null);
          setHistoryInitialSubcategory(null);
          setEditingExpense(exp);
        }}
        categories={categories}
        budgetConfig={config}
        initialCategory={historyInitialCategory}
        initialSubcategory={historyInitialSubcategory}
      />


      {/* Edit Expense Sheet — top-level to avoid nested overlay focus issues */}
      <EditExpenseSheet
        open={editingExpense !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingExpense(null);
            setActiveTab('home');
          }
        }}
        expense={editingExpense}
        onUpdateExpense={onUpdateExpense}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        budgetConfig={config}
      />

      {/* Full Budget Setup Sheet */}
      <FullBudgetSetupSheet
        open={editBudgetOpen}
        onOpenChange={setEditBudgetOpen}
        currentConfig={config}
        onSave={onUpdateConfig}
        previousBudgetSuggestion={previousBudgetSuggestion}
      />

      {/* Manage Accounts Sheet */}
      <ManageAccountsSheet
        open={manageAccountsOpen}
        onOpenChange={setManageAccountsOpen}
        accounts={accounts}
        onCreate={onCreateAccount}
        onUpdate={onUpdateAccount}
        onDelete={onDeleteAccount}
        onShare={handleShareAccount}
      />

      {/* Account Members Sheet */}
      <AccountMembersSheet
        open={membersSheetOpen}
        onOpenChange={(open) => {
          setMembersSheetOpen(open);
          if (!open) setSharingAccountId(null);
        }}
        accountName={sharingAccount?.name || ''}
        members={members}
        isOwner={isOwner}
        loading={membersLoading}
        onInvite={inviteMember}
        onRemove={removeMember}
        onResend={resendInvitation}
      />

      {/* Savings Sheet */}
      <SavingsSheet
        open={savingsOpen}
        onOpenChange={setSavingsOpen}
        accountId={currentAccount?.id ?? null}
      />

      {/* Bank Connection Sheet */}
      <BankConnectionSheet
        open={bankSheetOpen}
        onOpenChange={setBankSheetOpen}
        accountId={currentAccount?.id ?? null}
      />

      {/* Donald Duck Sticker */}
      {stickerData && (
        <DonaldSticker
          amount={stickerData.amount}
          expenseName={stickerData.name}
          onClose={() => setStickerData(null)}
        />
      )}

      {/* Category Budgets Overview Sheet */}
      <CategoryBudgetsOverview
        open={overviewOpen}
        onOpenChange={setOverviewOpen}
        categorySpending={categorySpending}
        categories={categories}
        configs={categoryConfigs}
        onSaveConfig={saveCategoryConfig}
      />

      {/* Pending DSP2 Transactions Sheet */}
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

      {/* Category Tree Manager Sheet */}
      <CategoryTreeManagerSheet
        open={treeManagerOpen}
        onOpenChange={(o) => {
          setTreeManagerOpen(o);
          if (!o) refetchCategories();
        }}
        accountId={currentAccount?.id ?? null}
      />

      {/* Settings Sheet — central access to all secondary actions */}
      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        pendingCount={pendingCount}
        alertsCount={alerts.length}
        onOpenBudgetSetup={() => setEditBudgetOpen(true)}
        onOpenManageAccounts={() => setManageAccountsOpen(true)}
        onOpenBank={() => setBankSheetOpen(true)}
        onOpenSavings={() => setSavingsOpen(true)}
        onOpenOverview={() => setOverviewOpen(true)}
        onOpenCategoryTree={() => setTreeManagerOpen(true)}
        onOpenPending={() => setPendingSheetOpen(true)}
        onOpenRecurringDebits={() => setRecurringDebitsOpen(true)}
        onSignOut={signOut}
      />

      {/* Recurring direct-debits calendar */}
      <RecurringDebitsCalendarSheet
        open={recurringDebitsOpen}
        onOpenChange={setRecurringDebitsOpen}
        accountId={currentAccount?.id ?? null}
        accountName={currentAccount?.name}
        targetMonth={config.month}
        targetYear={config.year}
        monthlyBudget={config.monthlyBudget}
      />
    </div>
  );
}
