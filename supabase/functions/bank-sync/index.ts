// Edge function: bank-sync
// Récupère les nouvelles transactions et les insère comme dépenses (avec catégorisation IA)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENABLE_BANKING_BASE = 'https://api.enablebanking.com';

async function generateJWT(appId: string, privateKeyPem: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'RS256', kid: appId };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: 'enablebanking.com', aud: 'api.enablebanking.com', iat: now, exp: now + 3600 };
  const encoder = new TextEncoder();
  const b64url = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    return btoa(String.fromCharCode(...bytes)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };
  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const pemBody = privateKeyPem.replace(/-----BEGIN[^-]+-----/g, '').replace(/-----END[^-]+-----/g, '').replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));
  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
}

// Catégorisation IA via Lovable AI Gateway
async function categorizeTransactions(
  transactions: { description: string; amount: number }[],
  categories: string[]
): Promise<string[]> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey || transactions.length === 0) return transactions.map(() => 'Autre');

  const prompt = `Catégorise chaque transaction bancaire dans UNE de ces catégories: ${categories.join(', ')}.
Réponds uniquement avec un JSON array de strings (catégorie pour chaque transaction, dans l'ordre).

Transactions:
${transactions.map((t, i) => `${i + 1}. "${t.description}" (${t.amount}€)`).join('\n')}`;

  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Tu es un assistant qui catégorise des transactions bancaires. Réponds UNIQUEMENT avec un JSON array de strings.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      console.error('AI categorization failed:', await res.text());
      return transactions.map(() => 'Autre');
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    const result = JSON.parse(cleaned);
    if (Array.isArray(result)) {
      return result.map(c => categories.includes(c) ? c : 'Autre');
    }
    return transactions.map(() => 'Autre');
  } catch (e) {
    console.error('Categorization error:', e);
    return transactions.map(() => 'Autre');
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    const body = await req.json();
    const { account_id } = body;
    if (!account_id) {
      return new Response(JSON.stringify({ error: 'account_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupère les connexions actives pour cet account
    const { data: connections, error: connErr } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('account_id', account_id)
      .eq('status', 'active');

    if (connErr) throw connErr;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0, message: 'No active connections' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Récupère catégories de l'account
    const { data: catsData } = await supabase
      .from('expense_categories')
      .select('id, name, parent_id')
      .eq('account_id', account_id);
    const categoryRows = (catsData || []) as { id: string; name: string; parent_id: string | null }[];
    const categoryById = new Map(categoryRows.map((c) => [c.id, c.name]));
    const subcategoryToParent = new Map<string, string>();
    for (const c of categoryRows) {
      if (c.parent_id && categoryById.has(c.parent_id)) {
        subcategoryToParent.set(c.name, categoryById.get(c.parent_id)!);
      }
    }
    const categoryNames = categoryRows.filter((c) => !c.parent_id).map((c) => c.name);
    if (categoryNames.length === 0) categoryNames.push('Autre');

    const normalizeSuggestion = (suggestion: string) => {
      const parent = subcategoryToParent.get(suggestion);
      return parent
        ? { category: parent, subcategory: suggestion }
        : { category: categoryNames.includes(suggestion) ? suggestion : 'Autre', subcategory: null as string | null };
    };

    // Pré-charge TOUS les budgets du compte pour répartir les tx dans le bon mois
    const { data: allBudgets } = await supabase
      .from('budgets')
      .select('id, month, year')
      .eq('account_id', account_id);

    const budgetByKey = new Map<string, string>();
    for (const b of (allBudgets || []) as { id: string; month: number; year: number }[]) {
      budgetByKey.set(`${b.year}-${b.month}`, b.id);
    }

    if (budgetByKey.size === 0) {
      return new Response(JSON.stringify({ success: true, imported: 0, message: 'No budget configured' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('ENABLE_BANKING_APP_ID')!;
    const privateKey = Deno.env.get('ENABLE_BANKING_PRIVATE_KEY')!;
    const jwt = await generateJWT(appId, privateKey);

    let totalImported = 0;
    const errors: string[] = [];
    const totalDeleted = 0;

    const extractFactDate = (desc: string): string | null => {
      const match = (desc || '').match(/\bFACT\s*(\d{2})[\/\.\-\s]?(\d{2})[\/\.\-\s]?(\d{2,4})\b/i);
      if (!match) return null;
      const day = parseInt(match[1], 10);
      const factMonth = parseInt(match[2], 10);
      let factYear = match[3];
      if (factYear.length === 2) factYear = `20${factYear}`;
      if (day < 1 || day > 31 || factMonth < 1 || factMonth > 12) return null;
      return `${factYear}-${String(factMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const budgetIdForDate = (date?: string | null): string | null => {
      const m = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (!m) return null;
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      return budgetByKey.get(`${y}-${mo}`) || null;
    };

    const normalizeDescription = (desc: string) => (desc || '').replace(/\s+/g, ' ').trim();

    const getTxDescription = (t: any) => normalizeDescription(
      t.remittance_information?.join(' ') || t.creditor?.name || t.debtor?.name || 'Transaction'
    ).slice(0, 180);

    const getTxSignature = (description: string, amount: number, date?: string | null) => (
      `${normalizeDescription(description).toLowerCase()}|${amount.toFixed(2)}|${String(date || '').slice(0, 10)}`
    );

    const getPurchaseDate = (t: any, desc: string) => {
      const dateFromLabel = extractFactDate(desc);
      if (dateFromLabel) return dateFromLabel;
      const candidates = [t.transaction_date, t.value_date, t.booking_date]
        .filter(Boolean)
        .map((d: string) => String(d).slice(0, 10))
        .filter((d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
      return candidates[0] || null;
    };

    for (const conn of connections) {
      // Vérifier expiration
      if (new Date(conn.valid_until) < new Date()) {
        await supabase.from('bank_connections').update({ status: 'expired' }).eq('id', conn.id);
        continue;
      }

      try {
        // 60 jours de recul pour rattraper les fins de mois précédentes
        const lookback = new Date();
        lookback.setDate(lookback.getDate() - 60);
        const sinceDate = lookback.toISOString().split('T')[0];

        // Récupère les statuts valides pouvant contenir l'encours carte
        const fetchTx = async (status: 'BOOK' | 'PDNG' | 'HOLD' | 'OTHR') => {
          const res = await fetch(
            `${ENABLE_BANKING_BASE}/accounts/${conn.bank_account_id}/transactions?date_from=${sinceDate}&transaction_status=${status}`,
            { headers: { Authorization: `Bearer ${jwt}`, 'psu-ip-address': '127.0.0.1' } }
          );
          if (!res.ok) {
            const errText = await res.text();
            console.error(`Tx fetch (${status}) failed for ${conn.id}:`, errText);
            return { ok: false, status: res.status, error: errText, transactions: [] as any[] };
          }
          const data = await res.json();
          return { ok: true, status: res.status, transactions: (data.transactions || []) as any[] };
        };

        const [booked, pending, hold, other] = await Promise.all([
          fetchTx('BOOK'),
          fetchTx('PDNG'),
          fetchTx('HOLD'),
          fetchTx('OTHR'),
        ]);

        if (!booked.ok && !pending.ok && !hold.ok && !other.ok) {
          const combinedErr = `${booked.error || ''} ${pending.error || ''} ${hold.error || ''} ${other.error || ''}`;
          const statuses = [booked.status, pending.status, hold.status, other.status];
          const sessionInvalid =
            /ACCOUNT_DOES_NOT_EXIST|SESSION_NOT_FOUND|SESSION_EXPIRED|UNAUTHORIZED|access.*revoked|consent.*expired/i.test(combinedErr) ||
            statuses.every(s => s === 401 || s === 403 || s === 404);

          if (sessionInvalid) {
            await supabase
              .from('bank_connections')
              .update({ status: 'expired', valid_until: new Date().toISOString() })
              .eq('id', conn.id);
            errors.push(`${conn.bank_name}: reconnexion nécessaire (autorisation bancaire expirée)`);
          } else {
            errors.push(`${conn.bank_name}: ${combinedErr.slice(0, 100)}`);
          }
          continue;
        }

        const transactions = [...booked.transactions, ...pending.transactions, ...hold.transactions, ...other.transactions];

        // Filtrer: que les débits (montants négatifs ou type DBIT)
        const debits = transactions.filter((t: { credit_debit_indicator?: string; transaction_amount?: { amount: string } }) => {
          return t.credit_debit_indicator === 'DBIT' || (t.transaction_amount && parseFloat(t.transaction_amount.amount) < 0);
        });

        // Filtrer celles déjà importées (toutes connexions du compte, pour éviter doublons après reconnexion)
        const { data: existing } = await supabase
          .from('bank_synced_transactions')
          .select('transaction_id, description, transaction_date, amount')
          .eq('account_id', account_id);

        const existingIds = new Set((existing || []).map((e: { transaction_id: string }) => e.transaction_id));
        const existingSignatures = new Set((existing || []).map((e: {
          description: string | null;
          amount: number | string | null;
          transaction_date: string | null;
        }) => getTxSignature(e.description || '', Math.abs(Number(e.amount || 0)), e.transaction_date)));

        // Aussi: signatures des dépenses déjà présentes dans les budgets du compte
        // (inclut les dépenses renommées manuellement : dédup tolérante sur montant+date)
        const existingAmountDateKeys = new Set<string>();
        const { data: accountBudgetsForDedup } = await supabase
          .from('budgets')
          .select('id')
          .eq('account_id', account_id);
        const budgetIdsForDedup = (accountBudgetsForDedup || []).map((b: { id: string }) => b.id);
        if (budgetIdsForDedup.length > 0) {
          const { data: existingExpenses } = await supabase
            .from('expenses')
            .select('name, amount, date')
            .in('budget_id', budgetIdsForDedup);
          for (const e of (existingExpenses || []) as { name: string | null; amount: number | string | null; date: string | null }[]) {
            const amt = Math.abs(Number(e.amount || 0));
            const cleanName = (e.name || '').replace(/^🏦\s*/, '');
            existingSignatures.add(getTxSignature(cleanName, amt, e.date));
            // Clé renommage-tolérante : même montant + même date = doublon
            existingAmountDateKeys.add(`${amt.toFixed(2)}|${String(e.date || '').slice(0, 10)}`);
          }
        }
        const seenIds = new Set<string>();
        const newTx = debits.filter((t: { entry_reference?: string; transaction_id?: string }) => {
          const id = t.entry_reference || t.transaction_id;
          if (!id || existingIds.has(id) || seenIds.has(id)) return false;
          const desc = getTxDescription(t);
          const date = getPurchaseDate(t, desc);
          if (!date) return false;
          // On n'accepte que les dates pour lesquelles un budget existe
          if (!budgetIdForDate(date)) return false;
          const amount = Math.abs(parseFloat((t as { transaction_amount?: { amount: string } }).transaction_amount?.amount || '0'));
          if (existingSignatures.has(getTxSignature(desc, amount, date))) return false;
          if (existingAmountDateKeys.has(`${amount.toFixed(2)}|${String(date || '').slice(0, 10)}`)) return false;
          seenIds.add(id);
          return true;
        });

        if (newTx.length === 0) {
          await supabase.from('bank_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', conn.id);
          continue;
        }

        // Préparer pour catégorisation
        const txForAI = newTx.map((t: {
          transaction_amount?: { amount: string };
        }) => ({
          description: getTxDescription(t).slice(0, 100),
          amount: Math.abs(parseFloat(t.transaction_amount?.amount || '0')),
        }));

        const categories = await categorizeTransactions(txForAI, categoryNames);

        // Insérer dépenses + traces
        for (let i = 0; i < newTx.length; i++) {
          const t = newTx[i];
          const txId = t.entry_reference || t.transaction_id;
          const amount = Math.abs(parseFloat(t.transaction_amount?.amount || '0'));
          const desc = txForAI[i].description;

          const date = getPurchaseDate(t, desc);
          if (!date) continue;
          const targetBudgetId = budgetIdForDate(date);
          if (!targetBudgetId) continue;

          const amountDateKey = `${amount.toFixed(2)}|${date}`;
          const signature = getTxSignature(desc, amount, date);
          if (existingIds.has(txId) || existingSignatures.has(signature) || existingAmountDateKeys.has(amountDateKey)) {
            continue;
          }

          // Garde-fou anti-doublon (course entre 2 syncs)
          const { data: conflictingExpense } = await supabase
            .from('expenses')
            .select('id')
            .eq('budget_id', targetBudgetId)
            .eq('date', date)
            .eq('amount', amount)
            .maybeSingle();

          if (conflictingExpense) {
            existingAmountDateKeys.add(amountDateKey);
            continue;
          }

          // Projection de prélèvement récurrent → on l'aligne au lieu de doublonner
          const { data: projectedDebit } = await supabase
            .from('expenses')
            .select('id, date, name')
            .eq('budget_id', targetBudgetId)
            .eq('amount', amount)
            .eq('is_direct_debit', true)
            .neq('date', date)
            .limit(1)
            .maybeSingle();

          let expense: { id: string } | null = null;

          if (projectedDebit) {
            const { data: updated, error: updErr } = await supabase
              .from('expenses')
              .update({
                date,
                name: `🏦 ${desc}`,
                suggested_category: categories[i],
                category: null,
                subcategory: null,
                validation_status: 'pending',
              })
              .eq('id', projectedDebit.id)
              .select('id')
              .single();
            if (updErr) {
              console.error('Projected debit update error:', updErr);
              continue;
            }
            expense = updated;
          } else {
            // Nouvelle dépense bancaire → toujours en "à catégoriser" (pending),
            // avec catégorie suggérée par l'IA (pas appliquée tant que non validée)
            const { data: inserted, error: expErr } = await supabase
              .from('expenses')
              .insert({
                user_id: userId,
                budget_id: targetBudgetId,
                amount,
                name: `🏦 ${desc}`,
                suggested_category: categories[i],
                validation_status: 'pending',
                date,
              })
              .select('id')
              .single();
            if (expErr) {
              console.error('Expense insert error:', expErr);
              continue;
            }
            expense = inserted;
          }

          const { error: syncErr } = await supabase.from('bank_synced_transactions').insert({
            bank_connection_id: conn.id,
            account_id,
            transaction_id: txId,
            expense_id: expense!.id,
            amount,
            transaction_date: date,
            description: desc,
          });

          if (syncErr) {
            console.error('Synced transaction insert error:', syncErr);
            if (!projectedDebit) {
              await supabase.from('expenses').delete().eq('id', expense!.id);
            }
            existingAmountDateKeys.add(amountDateKey);
            continue;
          }

          existingIds.add(txId);
          existingSignatures.add(signature);
          existingAmountDateKeys.add(amountDateKey);

          totalImported++;
        }


        await supabase.from('bank_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', conn.id);
      } catch (e) {
        console.error(`Sync error for ${conn.id}:`, e);
        errors.push(`${conn.bank_name}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported: totalImported,
      deleted: totalDeleted,
      errors: errors.length ? errors : undefined,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('bank-sync error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
