export interface Deduction {
  id: string;
  label: string;
  amount: string;
}

export interface BudgetConfig {
  monthlyBudget: number;
  month: number; // 0-11
  year: number;
  salary?: number;
  deductions?: Deduction[];
  savings?: number;
}

export interface Expense {
  id: string;
  amount: number;
  name?: string;
  category?: string;
  subcategory?: string;
  date: string; // YYYY-MM-DD
  createdAt: number;
  userEmail?: string; // Email of who created the expense
  isDirectDebit?: boolean;
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

/**
 * "Pure spending" excludes direct debits and bank transfers: they weigh on
 * the monthly budget but aren't day-to-day discretionary spending. Used by
 * the "Courbe" tab only — calculateBudgetMetrics/calculateDailyForecasts and
 * the Accueil/DailyForecastSheet views keep using every expense as before.
 */
export function isPureSpendingExpense(expense: Expense): boolean {
  if (expense.isDirectDebit) return false;
  if (expense.name && /VIR\s*SEPA/i.test(expense.name)) return false;
  return true;
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

export function isCurrentMonth(config: BudgetConfig): boolean {
  const { year, month } = getLocalDateComponents();
  return config.year === year && config.month === month;
}

export function isFutureMonth(config: BudgetConfig): boolean {
  const { year, month } = getLocalDateComponents();
  if (config.year > year) return true;
  if (config.year === year && config.month > month) return true;
  return false;
}

export function isPastMonth(config: BudgetConfig): boolean {
  const { year, month } = getLocalDateComponents();
  if (config.year < year) return true;
  if (config.year === year && config.month < month) return true;
  return false;
}

export function calculateBudgetMetrics(config: BudgetConfig, expenses: Expense[]) {
  const totalDays = getDaysInMonth(config.month, config.year);
  const { year: currentYear, month: currentMonth, day: currentDay } = getLocalDateComponents();
  
  // Check if this budget is for the current month
  const isThisMonth = config.year === currentYear && config.month === currentMonth;
  const isFuture = isFutureMonth(config);
  const isPast = isPastMonth(config);
  
  // For current month: use actual current day
  // For future month: day 1 (hasn't started)
  // For past month: last day of that month (month is over)
  let effectiveDay: number;
  if (isThisMonth) {
    effectiveDay = currentDay;
  } else if (isFuture) {
    effectiveDay = 0; // Before the month starts
  } else {
    effectiveDay = totalDays; // Month is over
  }
  
  // Days remaining INCLUDING today
  const daysRemaining = Math.max(0, totalDays - effectiveDay + (isThisMonth ? 1 : 0));
  
  const totalSpentThisMonth = expenses
    .filter(e => {
      const { year, month } = parseDateKey(e.date);
      return year === config.year && month === config.month;
    })
    .reduce((sum, e) => sum + e.amount, 0);
  
  // Budget remaining for today and future days
  const budgetRemaining = config.monthlyBudget - totalSpentThisMonth;
  
  // Calculate what was spent BEFORE today (not including today)
  const todayKey = getTodayKey();
  const spentToday = isThisMonth ? getTotalExpensesForDay(expenses, todayKey) : 0;
  const spentBeforeToday = totalSpentThisMonth - spentToday;
  
  // Calculate what SHOULD have been spent before today (theoretical budget for past days)
  const daysPassed = isThisMonth ? currentDay - 1 : (isFuture ? 0 : totalDays);
  const theoreticalDailyBudget = config.monthlyBudget / totalDays;
  const theoreticalSpentBeforeToday = daysPassed * theoreticalDailyBudget;
  
  // Rollover: if we spent less than theoretical, the difference rolls over
  // Budget for today = theoretical daily budget + savings from previous days
  const savingsFromPreviousDays = theoreticalSpentBeforeToday - spentBeforeToday;
  
  // Daily budget for today includes any rollover (positive or negative)
  const dailyBudget = theoreticalDailyBudget + savingsFromPreviousDays;
  
  const remainingToday = dailyBudget - spentToday;
  
  // Tomorrow's projected budget (recalculated based on remaining budget)
  const budgetAfterToday = budgetRemaining - spentToday;
  const daysAfterToday = Math.max(0, daysRemaining - 1);
  const tomorrowBudget = daysAfterToday > 0 ? budgetAfterToday / daysAfterToday : 0;
  
  return {
    totalDays,
    currentDay: effectiveDay,
    daysRemaining,
    budgetRemaining,
    dailyBudget,
    spentToday,
    remainingToday,
    tomorrowBudget,
    totalSpentThisMonth,
    isCurrentMonth: isThisMonth,
    isFutureMonth: isFuture,
    isPastMonth: isPast,
    theoreticalDailyBudget,
  };
}

export interface DailyForecast {
  day: number;
  date: string;
  estimatedBudget: number;
  isPast: boolean;
  isToday: boolean;
}

export function calculateDailyForecasts(config: BudgetConfig, expenses: Expense[]): DailyForecast[] {
  const totalDays = getDaysInMonth(config.month, config.year);
  const { year: currentYear, month: currentMonth, day: currentDay } = getLocalDateComponents();
  const isThisMonth = config.year === currentYear && config.month === currentMonth;
  const isFuture = isFutureMonth(config);
  
  const forecasts: DailyForecast[] = [];
  
  // Get spending per day
  const getSpentOnDay = (targetDay: number): number => {
    return expenses
      .filter(e => {
        const { year, month, day } = parseDateKey(e.date);
        return year === config.year && month === config.month && day === targetDay;
      })
      .reduce((sum, e) => sum + e.amount, 0);
  };
  
  const theoreticalDailyBudget = config.monthlyBudget / totalDays;
  
  // Calculate cumulative rollover up to today based on actual spending
  let rolloverUpToToday = 0;
  const effectiveToday = isThisMonth ? currentDay : (isFuture ? 0 : totalDays);
  
  for (let day = 1; day <= effectiveToday; day++) {
    const spentOnDay = getSpentOnDay(day);
    rolloverUpToToday += theoreticalDailyBudget - spentOnDay;
  }
  
  // Build forecasts for each day
  let cumulativeRollover = 0;
  
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `${config.year}-${String(config.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isPast = isThisMonth ? day < currentDay : !isFuture;
    const isToday = isThisMonth && day === currentDay;
    const isFutureDay = isThisMonth ? day > currentDay : isFuture;
    
    let estimatedBudget: number;
    
    if (isFutureDay) {
      // For future days: accumulate daily budget for each day from today
      // Day after today = rolloverUpToToday + 1 day of budget
      // 2 days from today = rolloverUpToToday + 2 days of budget, etc.
      const daysFromToday = day - currentDay;
      estimatedBudget = rolloverUpToToday + (daysFromToday * theoreticalDailyBudget);
    } else {
      // For past and today: calculate based on actual spending up to previous day
      estimatedBudget = theoreticalDailyBudget + cumulativeRollover;
      
      // Update cumulative rollover for next past/today day
      const spentOnDay = getSpentOnDay(day);
      cumulativeRollover += theoreticalDailyBudget - spentOnDay;
    }
    
    forecasts.push({
      day,
      date: dateKey,
      estimatedBudget,
      isPast,
      isToday,
    });
  }
  
  return forecasts;
}

// ── Weekly overview (calendar week, Monday → Sunday) ──────────────────────

const WEEKDAY_SHORT_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/**
 * Returns the 7 date keys (YYYY-MM-DD) of the calendar week (Monday → Sunday)
 * containing `referenceDate` (defaults to today). Mirrors the lastMonday/
 * lastSunday convention already used in supabase/functions/weekly-budget-report.
 */
export function getCurrentWeekDates(referenceDate: Date = new Date()): string[] {
  const dayOfWeek = referenceDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diffToMonday);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return dates;
}

/** 'Lun'…'Dim' label for a given YYYY-MM-DD date key. */
export function getWeekdayShortLabel(dateKey: string): string {
  const { year, month, day } = parseDateKey(dateKey);
  const jsDay = new Date(year, month, day).getDay(); // 0 = Sunday
  const idx = jsDay === 0 ? 6 : jsDay - 1; // remap to Monday = 0
  return WEEKDAY_SHORT_LABELS[idx];
}

export interface WeekDayPoint {
  date: string;
  label: string;
  isPast: boolean;
  isToday: boolean;
  isFuture: boolean;
  /** Actual amount spent that day. `null` for future days (no actual data yet). */
  spent: number | null;
  /** Rollover-aware budget allocated/projected for that day. */
  projectedBudget: number;
}

export interface WeeklyOverview {
  days: WeekDayPoint[];
  weekSpent: number;
  weekProjected: number;
  theoreticalDailyBudget: number;
}

/**
 * Builds the 7-day calendar-week overview used by the "Courbe" tab.
 *
 * `monthsData` holds one entry per distinct month actually touched by the
 * current week that has a budget configured (usually just one; two when the
 * week straddles a month boundary). The first entry is treated as the
 * "primary" month (the one matching today) and its theoretical daily budget
 * is used as the flat reference line and as a fallback projection for any
 * day whose month has no budget configured at all (which, since expenses
 * always require a budget_id, also means 0€ actually spent that day).
 */
export function calculateWeeklyOverview(
  monthsData: { config: BudgetConfig; expenses: Expense[] }[]
): WeeklyOverview {
  const weekDates = getCurrentWeekDates();
  const todayKey = getTodayKey();

  const primary = monthsData[0];
  const theoreticalDailyBudget = primary
    ? primary.config.monthlyBudget / getDaysInMonth(primary.config.month, primary.config.year)
    : 0;

  // Pre-compute daily forecasts once per distinct month touched by the week.
  const forecastsByMonth = new Map<string, ReturnType<typeof calculateDailyForecasts>>();
  for (const entry of monthsData) {
    const key = `${entry.config.year}-${entry.config.month}`;
    if (!forecastsByMonth.has(key)) {
      forecastsByMonth.set(key, calculateDailyForecasts(entry.config, entry.expenses));
    }
  }

  const days: WeekDayPoint[] = weekDates.map((date) => {
    const { year, month, day } = parseDateKey(date);
    const isPast = date < todayKey;
    const isToday = date === todayKey;
    const isFuture = date > todayKey;

    const monthKey = `${year}-${month}`;
    const monthEntry = monthsData.find((m) => m.config.year === year && m.config.month === month);

    let projectedBudget: number;
    let spent: number | null;

    if (monthEntry) {
      const forecasts = forecastsByMonth.get(monthKey)!;
      const forecast = forecasts.find((f) => f.day === day);
      projectedBudget = forecast ? forecast.estimatedBudget : theoreticalDailyBudget;
      spent = isFuture ? null : getTotalExpensesForDay(monthEntry.expenses, date);
    } else {
      // No budget configured for that month → no expenses can exist for it either.
      projectedBudget = theoreticalDailyBudget;
      spent = isFuture ? null : 0;
    }

    return {
      date,
      label: getWeekdayShortLabel(date),
      isPast,
      isToday,
      isFuture,
      spent,
      projectedBudget,
    };
  });

  const weekSpent = days.reduce((sum, d) => sum + (d.spent ?? 0), 0);
  const weekProjected = days.reduce((sum, d) => sum + d.projectedBudget, 0);

  return { days, weekSpent, weekProjected, theoreticalDailyBudget };
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
