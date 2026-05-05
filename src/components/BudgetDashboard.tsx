import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AddExpenseSheet } from './AddExpenseSheet';
import { ExpenseHistorySheet } from './ExpenseHistorySheet';
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
        <div className="flex items-center gap-0 shrink-0 -mr-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSavingsOpen(true)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <PiggyBank className="w-[18px] h-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setBankSheetOpen(true)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            title="Connecter ma banque"
          >
            <Landmark className="w-[18px] h-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <History className="w-[18px] h-[18px]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-secondary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-5 w-24 h-24 bg-accent/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '0.5s' }} />
        </div>

        {/* Status Badge */}
        <div className={cn('status-badge mb-4 animate-fade-in-up relative z-10', `status-${status}`)}>
          <StatusIcon className="w-4 h-4" />
          {currentStatus.label}
        </div>

        {/* Hero Amount with glow effect */}
        <div className="text-center space-y-2 mb-6 relative z-10">
          <p className="text-muted-foreground text-sm font-medium uppercase tracking-wide flex items-center justify-center gap-2">
            <Wallet className="w-4 h-4" />
            Reste aujourd'hui
          </p>
          <div
            className={cn(
              'hero-amount transition-all duration-200 relative',
              currentStatus.textClass,
              animateAmount && 'animate-number-pop'
            )}
          >
            <span className={cn(
              'absolute inset-0 blur-xl opacity-30',
              status === 'ok' && 'bg-budget-ok',
              status === 'warning' && 'bg-budget-warning',
              status === 'danger' && 'bg-budget-danger'
            )} />
            <span className="relative">{formatCurrencyCompact(metrics.remainingToday)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-sm mb-6 animate-fade-in-up relative z-10" style={{ animationDelay: '0.05s' }}>
          <div className="bg-muted/50 rounded-full h-3 overflow-hidden border border-border/50 backdrop-blur-sm">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-500 ease-out',
                status === 'ok' && 'bg-gradient-to-r from-budget-ok to-budget-ok/70',
                status === 'warning' && 'bg-gradient-to-r from-budget-warning to-budget-warning/70',
                status === 'danger' && 'bg-gradient-to-r from-budget-danger to-budget-danger/70'
              )}
              style={{ 
                width: `${Math.max(0, Math.min(100, (metrics.budgetRemaining / config.monthlyBudget) * 100))}%` 
              }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{formatCurrencyCompact(metrics.totalSpentThisMonth)} dépensé</span>
            <span>{formatCurrencyCompact(metrics.budgetRemaining)} restant</span>
          </div>
        </div>


        {/* Today's Expenses */}
        {todayExpenses.length > 0 && (
          <div className="w-full max-w-sm mb-6 animate-fade-in-up relative z-10" style={{ animationDelay: '0.1s' }}>
            <div className="budget-card space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Dépenses du jour
                </p>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {todayExpenses.length} {todayExpenses.length > 1 ? 'achats' : 'achat'}
                </span>
              </div>
              <div className="space-y-2">
                {todayExpenses.slice(-3).map((exp, index) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-sm">💸</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {exp.name || 'Dépense'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span>
                            {new Date(exp.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {exp.userEmail && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[100px]">{exp.userEmail.split('@')[0]}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-budget-danger">
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
              <div className="pt-2 flex justify-between items-center bg-muted/30 -mx-6 -mb-6 px-6 py-3 rounded-b-3xl">
                <span className="text-sm font-medium text-foreground">Total aujourd'hui</span>
                <span className="font-display font-bold text-lg text-foreground">
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
              "w-full text-left budget-card bg-gradient-to-br from-secondary/40 to-secondary/20 border-secondary/40 transition-all",
              !metrics.isFutureMonth && "hover:border-primary/30 hover:from-secondary/50 cursor-pointer"
            )}
          >
            {metrics.isFutureMonth ? (
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-secondary/50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-secondary-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Ce budget commence en {getMonthName(config.month)} {config.year}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vous pouvez déjà planifier vos dépenses
                </p>
              </div>
            ) : metrics.isPastMonth ? (
              <div className="text-center py-2">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted/50 flex items-center justify-center">
                  <History className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Ce mois est terminé
                </p>
                <p className="text-lg font-display font-bold text-foreground mt-1">
                  Total dépensé: {formatCurrencyCompact(metrics.totalSpentThisMonth)}
                </p>
                <p className="text-xs text-primary mt-2">
                  Voir les prévisions →
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      Prévu demain
                    </p>
                    <p className="text-2xl font-display font-bold text-foreground">
                      {formatCurrencyCompact(metrics.tomorrowBudget)}
                    </p>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-card/50 text-xs">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{metrics.daysRemaining} jours</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrencyCompact(metrics.budgetRemaining)}
                  </p>
                  <p className="text-xs text-primary">
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

      {/* Add Expense FAB - For current and future months */}
      {(metrics.isCurrentMonth || metrics.isFutureMonth) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <Button
            size="lg"
            onClick={() => setSheetOpen(true)}
            className="h-16 px-8 rounded-full shadow-lg text-lg font-medium"
          >
            <Plus className="mr-2 w-6 h-6" />
            Ajouter une dépense
          </Button>
        </div>
      )}

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
