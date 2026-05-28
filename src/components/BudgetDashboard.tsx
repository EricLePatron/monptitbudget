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
import { SavingsSheet } from './SavingsSheet';

import { CategoryBudgetsOverview } from './CategoryBudgetsOverview';
import { CategoryTreeManagerSheet } from './CategoryTreeManagerSheet';
import { PendingTransactionsSheet } from './PendingTransactionsSheet';
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
import { Plus, History, Settings, ChevronLeft, ChevronRight, Calendar, Inbox } from 'lucide-react';
import { BankConnectionSheet } from './BankConnectionSheet';
import { SettingsSheet } from './SettingsSheet';
import { CategoryPieChart } from './CategoryPieChart';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
interface BudgetDashboardProps {
  config: BudgetConfig;
  expenses: Expense[];
  onAddExpense: (amount: number, name?: string, category?: string, date?: string) => void;
  onDeleteExpense: (id: string) => void;
  onUpdateExpense: (
    expenseId: string,
    updates: { amount?: number; name?: string; category?: string; date?: string }
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

  const sharingAccount = accounts.find(a => a.id === sharingAccountId);

  // Get account members for the sharing account
  const {
    members,
    loading: membersLoading,
    isOwner,
    inviteMember,
    removeMember
  } = useAccountMembers(sharingAccountId, sharingAccount?.name);

  // Get expense categories (with subcategory support)
  const {
    categories,
    parentCategories,
    subcategoriesOf,
    addCategory,
    deleteCategory,
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

  // Emoji map for alerts
  const emojiMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.name, c.emoji])),
    [categories]
  );

  const categorySpending = useMemo(
    () => getCategorySpending(emojiMap),
    [getCategorySpending, emojiMap]
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

  const handleAddExpense = (amount: number, name?: string, category?: string, date?: string) => {
    onAddExpense(amount, name, category, date);
    setStickerData({ amount, name });
  };

  const [historyInitialCategory, setHistoryInitialCategory] = useState<string | null>(null);
  const openHistoryForCategory = (cat: string) => {
    setHistoryInitialCategory(cat);
    setHistoryOpen(true);
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

        {/* Camembert des dépenses par catégorie */}
        <div className="w-full max-w-sm relative z-10 animate-fade-in-up mb-4" style={{ animationDelay: '0.08s' }}>
          <CategoryPieChart
            categorySpending={categorySpending}
            emojiMap={emojiMap}
            onCategoryClick={openHistoryForCategory}
          />
        </div>


        {/* Spacer for FAB */}
        <div className="h-24" />
      </main>


      {/* Bottom action bar — History + Add expense + Settings */}
      <div className="fixed bottom-[max(env(safe-area-inset-bottom),16px)] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setHistoryOpen(true)}
          className="h-14 w-14 rounded-full bg-card/95 backdrop-blur border border-border shadow-xl text-foreground hover:bg-card hover:scale-105 active:scale-95 transition-all"
          title="Historique des dépenses"
          aria-label="Historique des dépenses"
        >
          <History className="w-5 h-5" />
        </Button>
        {(metrics.isCurrentMonth || metrics.isFutureMonth) && (
          <Button
            size="lg"
            onClick={() => setSheetOpen(true)}
            className="h-14 px-7 rounded-full shadow-xl text-base font-semibold"
          >
            <Plus className="mr-1.5 w-5 h-5" />
            Ajouter
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          className="h-14 w-14 rounded-full bg-card/95 backdrop-blur border border-border shadow-xl text-foreground hover:bg-card hover:scale-105 active:scale-95 transition-all relative"
          title="Paramètres"
          aria-label="Paramètres"
        >
          <Settings className="w-5 h-5" />
          {alerts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white shadow-[0_0_6px_rgba(245,158,11,0.7)]">
              {alerts.length > 9 ? '9+' : alerts.length}
            </span>
          )}
        </Button>
      </div>

      {/* placeholder removed: bottom bar replaces FAB */}

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
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (!open) setHistoryInitialCategory(null);
        }}
        expenses={expenses}
        onDeleteExpense={onDeleteExpense}
        onEditExpense={(exp) => {
          setHistoryOpen(false);
          setEditingExpense(exp);
        }}
        categories={categories}
        budgetConfig={config}
        initialCategory={historyInitialCategory}
      />


      {/* Edit Expense Sheet — top-level to avoid nested overlay focus issues */}
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
        onOpenChange={setTreeManagerOpen}
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
        onSignOut={signOut}
      />
    </div>
  );
}
