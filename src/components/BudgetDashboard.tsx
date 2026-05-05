import { useState } from 'react';
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
import { Plus, TrendingUp, TrendingDown, Minus, LogOut, History, Settings, Trash2, ChevronLeft, ChevronRight, Calendar, Sparkles, Wallet, PiggyBank, Landmark } from 'lucide-react';
import { BankConnectionSheet } from './BankConnectionSheet';
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
  const [animateAmount, setAnimateAmount] = useState(false);
  const [stickerData, setStickerData] = useState<{ amount: number; name?: string } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const sharingAccount = accounts.find(a => a.id === sharingAccountId);

  // Get account members for the sharing account
  const { 
    members, 
    loading: membersLoading, 
    isOwner, 
    inviteMember, 
    removeMember 
  } = useAccountMembers(sharingAccountId, sharingAccount?.name);

  // Get expense categories for the current account
  const { 
    categories, 
    addCategory,
    deleteCategory
  } = useExpenseCategories(currentAccount?.id ?? null);

  const handleShareAccount = (accountId: string) => {
    setSharingAccountId(accountId);
    setMembersSheetOpen(true);
  };

  const metrics = calculateBudgetMetrics(config, expenses);
  const status = getBudgetStatus(metrics.remainingToday, metrics.dailyBudget);
  const todayExpenses = getExpensesForDay(expenses, getTodayKey());

  const handleAddExpense = (amount: number, name?: string, category?: string, date?: string) => {
    onAddExpense(amount, name, category, date);
    
    // Trigger animation
    setAnimateAmount(true);
    setTimeout(() => setAnimateAmount(false), 300);
    
    // Show Donald Duck sticker
    setStickerData({ amount, name });
  };

  const statusConfig = {
    ok: {
      bgClass: 'bg-budget-ok-soft',
      textClass: 'text-budget-ok',
      glowClass: 'shadow-glow-ok',
      label: 'Tout va bien',
      icon: TrendingUp,
    },
    warning: {
      bgClass: 'bg-budget-warning-soft',
      textClass: 'text-budget-warning',
      glowClass: 'shadow-glow-warning',
      label: 'Attention',
      icon: Minus,
    },
    danger: {
      bgClass: 'bg-budget-danger-soft',
      textClass: 'text-budget-danger',
      glowClass: 'shadow-glow-danger',
      label: 'Dépassé',
      icon: TrendingDown,
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header — compact mobile-first */}
      <header className="px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 flex items-start justify-between gap-2 relative z-10">
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {/* Account Selector */}
          <AccountSelector
            accounts={accounts}
            currentAccount={currentAccount}
            onSwitch={onSwitchAccount}
            onManage={() => setManageAccountsOpen(true)}
          />
          {/* Month Navigation - Compact */}
          <div className="flex items-center gap-0.5 bg-secondary/60 rounded-full px-1 py-0.5 w-fit shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPreviousMonth}
              className="h-7 w-7 rounded-full text-foreground hover:bg-secondary"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              type="button"
              onClick={() => setEditBudgetOpen(true)}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              <span className="font-semibold text-sm text-foreground whitespace-nowrap">{getMonthName(config.month)} {config.year}</span>
              <Settings className="w-3 h-3 text-muted-foreground" />
            </button>
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
          <div className="flex items-center gap-2 pl-1">
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
        </div>
        <div className="flex items-center gap-1 shrink-0 bg-card/70 border border-border/60 rounded-full p-1 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSavingsOpen(true)}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            title="Épargne"
          >
            <PiggyBank className="w-[18px] h-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setBankSheetOpen(true)}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            title="Connecter ma banque"
          >
            <Landmark className="w-[18px] h-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Déconnexion"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center px-4 pt-2 pb-2 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-5 w-24 h-24 bg-accent/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Hero card — status + amount + progress combined */}
        <div className="w-full max-w-sm relative z-10 animate-fade-in-up mb-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-card via-card to-secondary/20 border border-border/60 shadow-xl px-5 pt-4 pb-5 backdrop-blur-sm">
            <div className="flex justify-center mb-2">
              <div className={cn('status-badge', `status-${status}`)}>
                <StatusIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">{currentStatus.label}</span>
              </div>
            </div>

            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1">
              <Wallet className="w-3.5 h-3.5" />
              Reste aujourd'hui
            </p>

            <div
              className={cn(
                'text-center font-display font-bold leading-none transition-all duration-200 relative text-[44px]',
                currentStatus.textClass,
                animateAmount && 'animate-number-pop'
              )}
            >
              <span className={cn(
                'absolute inset-0 blur-2xl opacity-30 -z-10',
                status === 'ok' && 'bg-budget-ok',
                status === 'warning' && 'bg-budget-warning',
                status === 'danger' && 'bg-budget-danger'
              )} />
              <span className="relative">{formatCurrencyCompact(metrics.remainingToday)}</span>
            </div>

            <div className="mt-4">
              <div className="bg-muted/60 rounded-full h-2.5 overflow-hidden border border-border/50">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500 ease-out',
                    status === 'ok' && 'bg-gradient-to-r from-budget-ok to-budget-ok/70',
                    status === 'warning' && 'bg-gradient-to-r from-budget-warning to-budget-warning/70',
                    status === 'danger' && 'bg-gradient-to-r from-budget-danger to-budget-danger/70'
                  )}
                  style={{
                    width: `${Math.max(0, Math.min(100, (metrics.budgetRemaining / config.monthlyBudget) * 100))}%`,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-muted-foreground font-medium">
                <span>{formatCurrencyCompact(metrics.totalSpentThisMonth)} dépensé</span>
                <span>{formatCurrencyCompact(metrics.budgetRemaining)} restant</span>
              </div>
            </div>
          </div>
        </div>


        {/* Today's Expenses */}
        {todayExpenses.length > 0 && (
          <div className="w-full max-w-sm mb-3 animate-fade-in-up relative z-10" style={{ animationDelay: '0.1s' }}>
            <div className="rounded-3xl bg-card border border-border/60 shadow-md p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Dépenses du jour
                </p>
                <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
                  {todayExpenses.length} {todayExpenses.length > 1 ? 'achats' : 'achat'}
                </span>
              </div>
              <div className="space-y-1">
                {todayExpenses.slice(-3).map((exp, index) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 animate-fade-in-up gap-2"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className="w-7 h-7 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs">💸</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {exp.name || 'Dépense'}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span>
                            {new Date(exp.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {exp.userEmail && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[80px]">{exp.userEmail.split('@')[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="font-display font-semibold text-sm text-budget-danger tabular-nums">
                        -{formatCurrencyCompact(exp.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-budget-danger hover:bg-budget-danger-soft"
                        onClick={() => onDeleteExpense(exp.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-muted/40 -mx-4 -mb-4 px-4 py-2.5 rounded-b-3xl">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wide">Total aujourd'hui</span>
                <span className="font-display font-bold text-base text-foreground tabular-nums">
                  {formatCurrencyCompact(metrics.spentToday)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tomorrow Preview / Month Status */}
        <div className="w-full max-w-sm animate-fade-in-up relative z-10" style={{ animationDelay: '0.15s' }}>
          <button
            type="button"
            onClick={() => !metrics.isFutureMonth && setForecastOpen(true)}
            className={cn(
              "w-full text-left rounded-3xl p-4 bg-gradient-to-br from-secondary/50 to-secondary/25 border border-secondary/50 shadow-md transition-all",
              !metrics.isFutureMonth && "hover:border-primary/30 hover:from-secondary/60 cursor-pointer active:scale-[0.99]"
            )}
          >
            {metrics.isFutureMonth ? (
              <div className="text-center py-1">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-secondary/60 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-secondary-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Ce budget commence en {getMonthName(config.month)} {config.year}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Vous pouvez déjà planifier vos dépenses
                </p>
              </div>
            ) : metrics.isPastMonth ? (
              <div className="text-center py-1">
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-muted/60 flex items-center justify-center">
                  <History className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce mois est terminé
                </p>
                <p className="text-base font-display font-bold text-foreground mt-0.5">
                  Total dépensé: {formatCurrencyCompact(metrics.totalSpentThisMonth)}
                </p>
                <p className="text-xs text-primary mt-1.5 font-semibold">
                  Voir les prévisions →
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-secondary/60 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      Prévu demain
                    </p>
                    <p className="text-xl font-display font-bold text-foreground tabular-nums leading-tight">
                      {formatCurrencyCompact(metrics.tomorrowBudget)}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-0.5 shrink-0">
                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-card/60 text-[10px]">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground font-medium">{metrics.daysRemaining} jours</span>
                  </div>
                  <p className="text-xs font-semibold text-foreground tabular-nums">
                    {formatCurrencyCompact(metrics.budgetRemaining)}
                  </p>
                  <p className="text-[11px] text-primary font-semibold">
                    Voir tout →
                  </p>
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Spacer for FAB */}
        <div className="h-24" />
      </main>

      {/* Bottom action bar — Add expense + History */}
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
            Ajouter une dépense
          </Button>
        )}
      </div>

      {/* placeholder removed: bottom bar replaces FAB */}

      {/* Add Expense Sheet */}
      <AddExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onAddExpense={handleAddExpense}
        categories={categories}
        onAddCategory={addCategory}
        onDeleteCategory={deleteCategory}
        budgetConfig={config}
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
        onOpenChange={setHistoryOpen}
        expenses={expenses}
        onDeleteExpense={onDeleteExpense}
        onEditExpense={(exp) => {
          setHistoryOpen(false);
          setEditingExpense(exp);
        }}
        categories={categories}
        budgetConfig={config}
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
    </div>
  );
}
