import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Config ───────────────────────────────────────────────────────────────────
const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET      = Deno.env.get("CRON_SECRET") ?? "";

// Recipients — configure via REPORT_RECIPIENTS env var (comma-separated)
// e.g. "alice@example.com,bob@example.com"
const RECIPIENTS = (Deno.env.get("REPORT_RECIPIENTS") ?? "")
  .split(",")
  .map((e) => e.trim())
  .filter(Boolean);

// Timezone offset for Paris (UTC+1 in winter, UTC+2 in summer)
function getParisOffset(): number {
  const jan = new Date(new Date().getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(new Date().getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = new Date().getTimezoneOffset() < Math.max(jan, jul);
  return isDST ? 2 : 1;
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string, opts: Intl.DateTimeFormatOptions = {}): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", {
    weekday: opts.weekday,
    day: "numeric",
    month: "long",
    year: opts.year,
    ...opts,
  });
}

const FRENCH_MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];

// ── Main handler ─────────────────────────────────────────────────────────────
serve(async (req) => {
  // Simple auth gate (called by pg_cron with Authorization header)
  const auth = req.headers.get("Authorization") ?? "";
  if (CRON_SECRET && !auth.includes(CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await generateAndSendReport();
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("weekly-budget-report error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ── Data fetching ─────────────────────────────────────────────────────────────
async function generateAndSendReport() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  // ── 1. Find "Famille" account ──────────────────────────────────────────────
  const { data: accounts, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, emoji");
  if (accErr) throw accErr;

  const familleAccount =
    accounts?.find((a) => /famille/i.test(a.name)) ??
    accounts?.[0];

  if (!familleAccount) throw new Error("No account found");

  // ── 2. Date ranges ─────────────────────────────────────────────────────────
  const now = new Date();
  // Last Monday = today - 7 days (function runs on Monday)
  const lastMonday = new Date(now);
  lastMonday.setDate(now.getDate() - 7);
  // Last Sunday = yesterday
  const lastSunday = new Date(now);
  lastSunday.setDate(now.getDate() - 1);

  const toYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const weekStart = toYMD(lastMonday);
  const weekEnd   = toYMD(lastSunday);

  // 4 weeks ago for comparison
  const fourWeeksAgo = new Date(now);
  fourWeeksAgo.setDate(now.getDate() - 28);
  const fourWeeksAgoStr = toYMD(fourWeeksAgo);

  // Current month bounds
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const monthStart   = toYMD(new Date(currentYear, currentMonth, 1));
  const monthEnd     = toYMD(new Date(currentYear, currentMonth + 1, 0));

  // ── 3. Get budgets for the account (last 2 months) ─────────────────────────
  const { data: budgets, error: budgErr } = await supabase
    .from("budgets")
    .select("id, monthly_budget, salary, month, year")
    .eq("account_id", familleAccount.id)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(3);
  if (budgErr) throw budgErr;

  const currentBudget = budgets?.find(
    (b) => b.month === currentMonth && b.year === currentYear
  );
  const budgetIds = budgets?.map((b) => b.id) ?? [];

  // ── 4. Get expenses (last 4 weeks) ─────────────────────────────────────────
  let allExpenses: Expense[] = [];
  if (budgetIds.length > 0) {
    const { data: expData, error: expErr } = await supabase
      .from("expenses")
      .select("id, amount, name, category, date, budget_id")
      .in("budget_id", budgetIds)
      .gte("date", fourWeeksAgoStr)
      .order("date", { ascending: false });
    if (expErr) throw expErr;
    allExpenses = (expData ?? []).map((e) => ({
      ...e,
      amount: Number(e.amount),
    }));
  }

  // ── 5. Get category caps ───────────────────────────────────────────────────
  const { data: catConfigs } = await supabase
    .from("category_budget_configs")
    .select("category_name, cap_amount, budget_type, warning_threshold")
    .eq("account_id", familleAccount.id)
    .not("cap_amount", "is", null);

  const capMap: Record<string, number> = {};
  for (const c of catConfigs ?? []) {
    if (c.cap_amount) capMap[c.category_name] = Number(c.cap_amount);
  }

  // ── 6. Slice into weeks ────────────────────────────────────────────────────
  const lastWeekExp     = allExpenses.filter((e) => e.date >= weekStart && e.date <= weekEnd);
  const currentMonthExp = allExpenses.filter((e) => e.date >= monthStart && e.date <= monthEnd);

  // Previous 3 weeks for comparison
  const prevWeeks: { label: string; total: number }[] = [];
  for (let i = 1; i <= 3; i++) {
    const wEnd   = new Date(lastMonday);
    wEnd.setDate(lastMonday.getDate() - 1 - (i - 1) * 7);
    const wStart = new Date(wEnd);
    wStart.setDate(wEnd.getDate() - 6);
    const wStartStr = toYMD(wStart);
    const wEndStr   = toYMD(wEnd);
    const total = allExpenses
      .filter((e) => e.date >= wStartStr && e.date <= wEndStr)
      .reduce((s, e) => s + e.amount, 0);
    prevWeeks.push({
      label: `${formatDate(wStartStr, { weekday: undefined })} – ${formatDate(wEndStr, { weekday: undefined })}`,
      total,
    });
  }

  const weekTotal = lastWeekExp.reduce((s, e) => s + e.amount, 0);
  const monthTotal = currentMonthExp.reduce((s, e) => s + e.amount, 0);
  const prevWeekAvg = prevWeeks.reduce((s, w) => s + w.total, 0) / (prevWeeks.length || 1);
  const vsPrevWeek = prevWeeks[0]?.total ?? 0;
  const vsPrevWeekDelta = weekTotal - vsPrevWeek;
  const vsPrevWeekPct = vsPrevWeek > 0 ? Math.round((vsPrevWeekDelta / vsPrevWeek) * 100) : 0;

  // ── 7. Category breakdown (last week + month) ─────────────────────────────
  const catWeek: Record<string, number> = {};
  for (const e of lastWeekExp) {
    const cat = e.category || "Autre";
    catWeek[cat] = (catWeek[cat] ?? 0) + e.amount;
  }
  const catMonth: Record<string, number> = {};
  for (const e of currentMonthExp) {
    const cat = e.category || "Autre";
    catMonth[cat] = (catMonth[cat] ?? 0) + e.amount;
  }

  const allCats = Array.from(
    new Set([...Object.keys(catWeek), ...Object.keys(catMonth)])
  ).sort((a, b) => (catMonth[b] ?? 0) - (catMonth[a] ?? 0));

  // ── 8. Projection fin de mois ──────────────────────────────────────────────
  const daysInMonth     = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayOfMonth      = now.getDate();
  const daysElapsed     = dayOfMonth - 1; // expenses up to yesterday (last Sunday)
  const daysRemaining   = daysInMonth - (dayOfMonth - 1);
  const dailyAvg        = daysElapsed > 0 ? monthTotal / daysElapsed : 0;
  const projectedTotal  = monthTotal + dailyAvg * daysRemaining;
  const monthlyBudget   = currentBudget ? Number(currentBudget.monthly_budget) : 0;
  const budgetRemaining = monthlyBudget - monthTotal;
  const projectedDelta  = monthlyBudget - projectedTotal;

  // ── 9. Build HTML email ───────────────────────────────────────────────────
  const html = buildEmailHTML({
    accountName: familleAccount.name,
    accountEmoji: familleAccount.emoji ?? "👨‍👩‍👧‍👦",
    weekStart,
    weekEnd,
    weekTotal,
    prevWeeks,
    prevWeekAvg,
    vsPrevWeekDelta,
    vsPrevWeekPct,
    lastWeekExp,
    currentMonth,
    currentYear,
    monthTotal,
    monthlyBudget,
    budgetRemaining,
    projectedTotal,
    projectedDelta,
    daysRemaining,
    dailyAvg,
    allCats,
    catWeek,
    catMonth,
    capMap,
  });

  // ── 10. Send via Resend ────────────────────────────────────────────────────
  const monthLabel = `${FRENCH_MONTHS[currentMonth]} ${currentYear}`;
  const weekLabel  = `${formatDate(weekStart)} – ${formatDate(weekEnd)}`;
  const subject    = `💰 Budget ${familleAccount.name} — semaine du ${weekLabel}`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "monptitbudget <onboarding@resend.dev>",
      to: RECIPIENTS,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Resend error: ${JSON.stringify(err)}`);
  }

  const emailRes = await res.json();
  console.log("Weekly report sent:", emailRes);
  return { success: true, sent_to: RECIPIENTS, week: weekLabel };
}

// ── HTML builder ──────────────────────────────────────────────────────────────
interface Expense {
  id: string;
  amount: number;
  name: string | null;
  category: string | null;
  date: string;
  budget_id: string;
}

function statusColor(pct: number): string {
  if (pct >= 100) return "#ef4444";
  if (pct >= 80)  return "#f59e0b";
  return "#10b981";
}

function arrow(delta: number): string {
  if (delta > 0)  return `<span style="color:#ef4444">↑ ${formatEuro(Math.abs(delta))}</span>`;
  if (delta < 0)  return `<span style="color:#10b981">↓ ${formatEuro(Math.abs(delta))}</span>`;
  return `<span style="color:#888">= stable</span>`;
}

function buildEmailHTML(d: {
  accountName: string; accountEmoji: string;
  weekStart: string; weekEnd: string;
  weekTotal: number; prevWeeks: { label: string; total: number }[];
  prevWeekAvg: number; vsPrevWeekDelta: number; vsPrevWeekPct: number;
  lastWeekExp: Expense[];
  currentMonth: number; currentYear: number;
  monthTotal: number; monthlyBudget: number; budgetRemaining: number;
  projectedTotal: number; projectedDelta: number; daysRemaining: number; dailyAvg: number;
  allCats: string[]; catWeek: Record<string, number>; catMonth: Record<string, number>; capMap: Record<string, number>;
}): string {
  const FRENCH_MONTHS_LOCAL = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const monthLabel  = `${FRENCH_MONTHS_LOCAL[d.currentMonth]} ${d.currentYear}`;
  const weekLabel   = `${formatDate(d.weekStart)} – ${formatDate(d.weekEnd)}`;
  const projStatus  = d.projectedDelta >= 0 ? "#10b981" : "#ef4444";
  const budgetPct   = d.monthlyBudget > 0 ? Math.round((d.monthTotal / d.monthlyBudget) * 100) : 0;
  const budgetBarW  = Math.min(100, budgetPct);
  const budgetBarC  = budgetPct >= 100 ? "#ef4444" : budgetPct >= 80 ? "#f59e0b" : "#10b981";

  // Category rows
  const catRows = d.allCats
    .filter((c) => (d.catMonth[c] ?? 0) > 0)
    .map((cat) => {
      const week  = d.catWeek[cat] ?? 0;
      const month = d.catMonth[cat] ?? 0;
      const cap   = d.capMap[cat];
      const pct   = cap ? Math.round((month / cap) * 100) : null;
      const color = pct !== null ? statusColor(pct) : "#888";
      const capCell = cap
        ? `<td style="padding:8px 12px;text-align:right;color:${color};font-weight:700">${pct}% <span style="font-weight:400;color:#888">/${formatEuro(cap)}</span></td>`
        : `<td style="padding:8px 12px;text-align:right;color:#555">libre</td>`;
      return `
        <tr style="border-bottom:1px solid #222">
          <td style="padding:8px 12px;color:#e0e0e0">${cat}</td>
          <td style="padding:8px 12px;text-align:right;color:#e0e0e0">${week > 0 ? formatEuro(week) : "—"}</td>
          <td style="padding:8px 12px;text-align:right;font-weight:600;color:#fff">${formatEuro(month)}</td>
          ${capCell}
        </tr>`;
    }).join("");

  // Expense list rows (last week)
  const expRows = d.lastWeekExp
    .sort((a, b) => b.amount - a.amount)
    .map((e) => `
      <tr style="border-bottom:1px solid #1a1a1a">
        <td style="padding:6px 12px;color:#888;font-size:13px">${formatDate(e.date)}</td>
        <td style="padding:6px 12px;color:#ccc;font-size:13px">${e.name || "—"}</td>
        <td style="padding:6px 12px;color:#aaa;font-size:13px">${e.category || "Autre"}</td>
        <td style="padding:6px 12px;text-align:right;color:#fff;font-weight:600;font-size:13px">-${formatEuro(e.amount)}</td>
      </tr>`)
    .join("");

  // Prev weeks comparison
  const prevWeekRows = d.prevWeeks.map((w, i) => `
    <tr>
      <td style="padding:4px 8px;color:#888;font-size:12px">S-${i + 1} · ${w.label}</td>
      <td style="padding:4px 8px;text-align:right;color:#aaa;font-size:12px">${formatEuro(w.total)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:24px 16px">

  <!-- Header -->
  <div style="text-align:center;margin-bottom:24px">
    <div style="font-size:40px;margin-bottom:8px">${d.accountEmoji}</div>
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700">Budget ${d.accountName}</h1>
    <p style="margin:4px 0 0;color:#888;font-size:14px">Rapport hebdomadaire · ${weekLabel}</p>
  </div>

  <!-- Week summary card -->
  <div style="background:#1a1a1a;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #2a2a2a">
    <p style="margin:0 0 4px;color:#888;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase">Dépensé cette semaine</p>
    <div style="font-size:42px;font-weight:800;color:#fff;margin:4px 0">${formatEuro(d.weekTotal)}</div>
    <div style="font-size:14px;color:#aaa;margin-top:4px">
      vs semaine précédente : ${arrow(d.vsPrevWeekDelta)}
      ${d.vsPrevWeekPct !== 0 ? `<span style="color:#555">(${d.vsPrevWeekPct > 0 ? "+" : ""}${d.vsPrevWeekPct}%)</span>` : ""}
    </div>
    <div style="margin-top:12px;font-size:12px;color:#666">
      Moyenne des 3 semaines précédentes : ${formatEuro(d.prevWeekAvg)}
    </div>
    <!-- Mini prev weeks -->
    <table style="width:100%;margin-top:10px;border-collapse:collapse">${prevWeekRows}</table>
  </div>

  <!-- Categories -->
  <div style="background:#1a1a1a;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #2a2a2a">
    <h2 style="margin:0 0 16px;color:#fff;font-size:16px;font-weight:700">📂 Par catégorie — ${monthLabel}</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:2px solid #333">
          <th style="padding:8px 12px;text-align:left;color:#666;font-size:11px;font-weight:700;text-transform:uppercase">Catégorie</th>
          <th style="padding:8px 12px;text-align:right;color:#666;font-size:11px;font-weight:700;text-transform:uppercase">Cette sem.</th>
          <th style="padding:8px 12px;text-align:right;color:#666;font-size:11px;font-weight:700;text-transform:uppercase">Ce mois</th>
          <th style="padding:8px 12px;text-align:right;color:#666;font-size:11px;font-weight:700;text-transform:uppercase">Plafond</th>
        </tr>
      </thead>
      <tbody>${catRows}</tbody>
      <tfoot>
        <tr style="border-top:2px solid #333">
          <td style="padding:10px 12px;color:#fff;font-weight:700">TOTAL</td>
          <td style="padding:10px 12px;text-align:right;color:#fff;font-weight:700">${formatEuro(d.weekTotal)}</td>
          <td style="padding:10px 12px;text-align:right;color:#fff;font-weight:800;font-size:16px">${formatEuro(d.monthTotal)}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- Month impact -->
  <div style="background:#1a1a1a;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #2a2a2a">
    <h2 style="margin:0 0 16px;color:#fff;font-size:16px;font-weight:700">📅 Impact sur ${monthLabel}</h2>

    ${d.monthlyBudget > 0 ? `
    <!-- Budget bar -->
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:#aaa;font-size:13px">${formatEuro(d.monthTotal)} dépensé</span>
        <span style="color:#aaa;font-size:13px">Budget : ${formatEuro(d.monthlyBudget)}</span>
      </div>
      <div style="height:10px;background:#2a2a2a;border-radius:999px;overflow:hidden">
        <div style="height:100%;width:${budgetBarW}%;background:${budgetBarC};border-radius:999px;transition:width .3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <span style="color:#666;font-size:12px">${budgetPct}% consommé</span>
        <span style="color:${budgetBarC};font-size:12px;font-weight:700">${formatEuro(Math.abs(d.budgetRemaining))} ${d.budgetRemaining >= 0 ? "restants" : "de dépassement"}</span>
      </div>
    </div>

    <!-- Projection -->
    <div style="background:#111;border-radius:10px;padding:14px;border:1px solid ${projStatus}33">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px">Projection fin de mois</div>
          <div style="color:#fff;font-size:22px;font-weight:800">${formatEuro(d.projectedTotal)}</div>
          <div style="color:#666;font-size:12px;margin-top:2px">${d.daysRemaining} jours restants · ~${formatEuro(d.dailyAvg)}/jour</div>
        </div>
        <div style="text-align:right">
          <div style="color:${projStatus};font-size:18px;font-weight:800">
            ${d.projectedDelta >= 0 ? "+" : ""}${formatEuro(d.projectedDelta)}
          </div>
          <div style="color:#666;font-size:11px">${d.projectedDelta >= 0 ? "d'épargne projetée" : "de dépassement projeté"}</div>
        </div>
      </div>
    </div>
    ` : `<p style="color:#666;font-size:14px">Aucun budget configuré pour ${monthLabel}. Ouvre l'app pour le configurer.</p>`}
  </div>

  <!-- Expense detail -->
  ${d.lastWeekExp.length > 0 ? `
  <div style="background:#1a1a1a;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #2a2a2a">
    <h2 style="margin:0 0 16px;color:#fff;font-size:16px;font-weight:700">🧾 Détail de la semaine (${d.lastWeekExp.length} dépenses)</h2>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="border-bottom:1px solid #333">
          <th style="padding:6px 12px;text-align:left;color:#555;font-size:11px">Date</th>
          <th style="padding:6px 12px;text-align:left;color:#555;font-size:11px">Nom</th>
          <th style="padding:6px 12px;text-align:left;color:#555;font-size:11px">Catégorie</th>
          <th style="padding:6px 12px;text-align:right;color:#555;font-size:11px">Montant</th>
        </tr>
      </thead>
      <tbody>${expRows}</tbody>
    </table>
  </div>` : `
  <div style="background:#1a1a1a;border-radius:16px;padding:20px;margin-bottom:16px;border:1px solid #2a2a2a;text-align:center">
    <div style="font-size:32px;margin-bottom:8px">🎉</div>
    <p style="color:#10b981;font-size:16px;font-weight:700;margin:0">Aucune dépense cette semaine !</p>
  </div>`}

  <!-- Footer -->
  <div style="text-align:center;padding:16px 0">
    <p style="color:#444;font-size:12px;margin:0">
      Envoyé automatiquement par <strong style="color:#666">monptitbudget</strong> · Chaque lundi matin
    </p>
  </div>

</div>
</body>
</html>`;
}
