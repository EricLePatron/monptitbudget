export interface BudgetConfig {
  monthlyBudget: number;
  month: number; // 0-11
  year: number;
}

export interface Expense {
  id: string;
  amount: number;
  name?: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
}

export interface BudgetState {
  config: BudgetConfig | null;
  expenses: Expense[];
}

export type BudgetStatus = 'ok' | 'warning' | 'danger';

// Get current local date components for consistent date handling
export function getLocalDateComponents(): { year: number; month: number; day: number } {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(), // 0-11
    day: now.getDate(),
  };
}

export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getCurrentDayOfMonth(): number {
  return getLocalDateComponents().day;
}

export function getTodayKey(): string {
  const { year, month, day } = getLocalDateComponents();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateKey.split('-').map(Number);
  return { year, month: month - 1, day }; // month is 0-11
}

export function getExpensesForDay(expenses: Expense[], dateKey: string): Expense[] {
  return expenses.filter(e => e.date === dateKey);
}

export function getTotalExpensesForDay(expenses: Expense[], dateKey: string): number {
  return getExpensesForDay(expenses, dateKey).reduce((sum, e) => sum + e.amount, 0);
}

export function getTotalExpensesUpToToday(expenses: Expense[], config: BudgetConfig): number {
  const todayKey = getTodayKey();
  const { year: todayYear, month: todayMonth, day: todayDay } = parseDateKey(todayKey);
  
  return expenses
    .filter(e => {
      const { year, month, day } = parseDateKey(e.date);
      // Only include expenses from the budget's month/year that are on or before today
      if (year !== config.year || month !== config.month) return false;
      // Compare if expense date <= today
      if (year < todayYear) return true;
      if (year > todayYear) return false;
      if (month < todayMonth) return true;
      if (month > todayMonth) return false;
      return day <= todayDay;
    })
    .reduce((sum, e) => sum + e.amount, 0);
}

export function calculateBudgetMetrics(config: BudgetConfig, expenses: Expense[]) {
  const totalDays = getDaysInMonth(config.month, config.year);
  const currentDay = getCurrentDayOfMonth();
  const daysRemaining = totalDays - currentDay + 1;
  
  const totalSpentThisMonth = getTotalExpensesUpToToday(expenses, config);
  const budgetRemaining = config.monthlyBudget - totalSpentThisMonth;
  
  const dailyBudget = budgetRemaining / daysRemaining;
  
  const todayKey = getTodayKey();
  const spentToday = getTotalExpensesForDay(expenses, todayKey);
  const remainingToday = dailyBudget - spentToday;
  
  // Tomorrow's projected budget
  const budgetAfterToday = budgetRemaining - spentToday;
  const daysAfterToday = daysRemaining - 1;
  const tomorrowBudget = daysAfterToday > 0 ? budgetAfterToday / daysAfterToday : 0;
  
  return {
    totalDays,
    currentDay,
    daysRemaining,
    budgetRemaining,
    dailyBudget,
    spentToday,
    remainingToday,
    tomorrowBudget,
    totalSpentThisMonth,
  };
}

export function getBudgetStatus(remainingToday: number, dailyBudget: number): BudgetStatus {
  const ratio = remainingToday / dailyBudget;
  if (remainingToday <= 0) return 'danger';
  if (ratio < 0.3) return 'warning';
  return 'ok';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  const formatted = Math.abs(amount).toFixed(amount % 1 === 0 ? 0 : 2);
  return `${amount < 0 ? '-' : ''}${formatted} €`;
}

export function getMonthName(month: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[month];
}

// Storage
const STORAGE_KEY = 'daily-budget-tracker';

export function saveBudgetState(state: BudgetState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadBudgetState(): BudgetState {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return { config: null, expenses: [] };
    }
  }
  return { config: null, expenses: [] };
}

export function generateExpenseId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
