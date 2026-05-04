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

    const { account_id } = await req.json();
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
      .select('name')
      .eq('account_id', account_id);
    const categoryNames = (catsData || []).map((c: { name: string }) => c.name);
    if (categoryNames.length === 0) categoryNames.push('Autre');

    // Trouve le budget du mois courant
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();

    const { data: budget } = await supabase
      .from('budgets')
      .select('id')
      .eq('account_id', account_id)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();

    if (!budget) {
      return new Response(JSON.stringify({ success: true, imported: 0, message: 'No budget for current month' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('ENABLE_BANKING_APP_ID')!;
    const privateKey = Deno.env.get('ENABLE_BANKING_PRIVATE_KEY')!;
    const jwt = await generateJWT(appId, privateKey);

    let totalImported = 0;
    const errors: string[] = [];

    let totalDeleted = 0;

    const isExcludedDesc = (desc: string) => {
      const lower = (desc || '').toLowerCase();
      return lower.includes('debit mensuel') || lower.includes('débit mensuel')
        || lower.includes('releve carte') || lower.includes('relevé carte')
        || lower.includes('debit differe') || lower.includes('débit différé');
    };

    for (const conn of connections) {
      // Vérifier expiration
      if (new Date(conn.valid_until) < new Date()) {
        await supabase.from('bank_connections').update({ status: 'expired' }).eq('id', conn.id);
        continue;
      }

      // Nettoyage : supprimer les dépenses déjà importées qui ne devraient plus l'être
      // (libellé exclu OU hors mois budget courant)
      try {
        const { data: alreadySynced } = await supabase
          .from('bank_synced_transactions')
          .select('id, expense_id, description, transaction_date')
          .eq('bank_connection_id', conn.id);

        const toDelete = (alreadySynced || []).filter((s: { description: string | null; transaction_date: string }) => {
          if (isExcludedDesc(s.description || '')) return true;
          const d = new Date(s.transaction_date);
          return d.getMonth() !== month || d.getFullYear() !== year;
        });

        if (toDelete.length > 0) {
          const expenseIds = toDelete.map(s => s.expense_id).filter(Boolean) as string[];
          const syncedIds = toDelete.map(s => s.id);
          if (expenseIds.length > 0) {
            await supabase.from('expenses').delete().in('id', expenseIds);
          }
          await supabase.from('bank_synced_transactions').delete().in('id', syncedIds);
          totalDeleted += toDelete.length;
        }
      } catch (e) {
        console.error('Cleanup error:', e);
      }

      try {
        // On ne récupère que le mois budget courant (encours carte inclus)
        const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
        const lastSync = conn.last_synced_at ? new Date(conn.last_synced_at).toISOString().split('T')[0] : null;
        const sinceDate = lastSync && lastSync > startOfMonth ? lastSync : startOfMonth;

        // Récupère booked + pending + info (encours carte / débit différé non encore comptabilisé)
        const fetchTx = async (status: 'BOOK' | 'PDNG' | 'INFO') => {
          const res = await fetch(
            `${ENABLE_BANKING_BASE}/accounts/${conn.bank_account_id}/transactions?date_from=${sinceDate}&transaction_status=${status}`,
            { headers: { Authorization: `Bearer ${jwt}`, 'psu-ip-address': '127.0.0.1' } }
          );
          if (!res.ok) {
            const errText = await res.text();
            console.error(`Tx fetch (${status}) failed for ${conn.id}:`, errText);
            return { ok: false, error: errText, transactions: [] as any[] };
          }
          const data = await res.json();
          return { ok: true, transactions: (data.transactions || []) as any[] };
        };

        const [booked, pending, info] = await Promise.all([
          fetchTx('BOOK'),
          fetchTx('PDNG'),
          fetchTx('INFO'),
        ]);

        if (!booked.ok && !pending.ok && !info.ok) {
          errors.push(`${conn.bank_name}: ${(booked.error || pending.error || info.error || '').slice(0, 100)}`);
          continue;
        }

        const transactions = [...booked.transactions, ...pending.transactions, ...info.transactions];

        // Filtrer: que les débits (montants négatifs ou type DBIT)
        const debits = transactions.filter((t: { credit_debit_indicator?: string; transaction_amount?: { amount: string } }) => {
          return t.credit_debit_indicator === 'DBIT' || (t.transaction_amount && parseFloat(t.transaction_amount.amount) < 0);
        });

        // Filtrer celles déjà importées
        const txIds = debits.map((t: { entry_reference?: string; transaction_id?: string }) => t.entry_reference || t.transaction_id).filter(Boolean);
        const { data: existing } = await supabase
          .from('bank_synced_transactions')
          .select('transaction_id')
          .eq('bank_connection_id', conn.id)
          .in('transaction_id', txIds);

        const existingIds = new Set((existing || []).map((e: { transaction_id: string }) => e.transaction_id));
        // Dédup intra-fetch (un débit différé peut apparaître en pending puis booked)
        const seenIds = new Set<string>();
        const newTx = debits.filter((t: { entry_reference?: string; transaction_id?: string }) => {
          const id = t.entry_reference || t.transaction_id;
          if (!id || existingIds.has(id) || seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });

        if (newTx.length === 0) {
          await supabase.from('bank_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', conn.id);
          continue;
        }

        // Préparer pour catégorisation
        const txForAI = newTx.map((t: {
          remittance_information?: string[];
          creditor?: { name?: string };
          transaction_amount?: { amount: string };
        }) => ({
          description: (t.remittance_information?.join(' ') || t.creditor?.name || 'Transaction').slice(0, 100),
          amount: Math.abs(parseFloat(t.transaction_amount?.amount || '0')),
        }));

        const categories = await categorizeTransactions(txForAI, categoryNames);

        // Insérer dépenses + traces
        for (let i = 0; i < newTx.length; i++) {
          const t = newTx[i];
          const txId = t.entry_reference || t.transaction_id;
          const amount = Math.abs(parseFloat(t.transaction_amount?.amount || '0'));
          const desc = txForAI[i].description;

          // Date d'achat réelle : on prend la PLUS ANCIENNE entre transaction_date et value_date
          // (pour cartes à débit différé, value_date = date de débit groupé future, on veut la vraie date d'achat)
          const candidates = [t.transaction_date, t.value_date, t.booking_date].filter(Boolean) as string[];
          if (candidates.length === 0) continue;
          const sorted = candidates.sort();
          const purchaseDate = sorted[0];

          // Tenter aussi d'extraire une date depuis le libellé "FACT JJMMAA" ou "FACT JJ/MM/AA"
          const factMatch = desc.match(/FACT\s*(\d{2})[\/\.\-]?(\d{2})[\/\.\-]?(\d{2,4})/i);
          let dateFromLabel: string | null = null;
          if (factMatch) {
            const dd = factMatch[1];
            const mm = factMatch[2];
            let yy = factMatch[3];
            if (yy.length === 2) yy = '20' + yy;
            dateFromLabel = `${yy}-${mm}-${dd}`;
          }

          const date = dateFromLabel && dateFromLabel < purchaseDate ? dateFromLabel : purchaseDate;

          // Ignorer le débit mensuel groupé carte (libellé typique)
          const lower = desc.toLowerCase();
          if (lower.includes('debit mensuel') || lower.includes('débit mensuel') || lower.includes('releve carte') || lower.includes('relevé carte') || lower.includes('debit differe') || lower.includes('débit différé')) {
            continue;
          }

          // Vérif stricte du mois (parsing UTC pour éviter les décalages)
          const [yStr, mStr] = date.split('-');
          const txYear = parseInt(yStr);
          const txMonth = parseInt(mStr) - 1;
          if (txMonth !== month || txYear !== year) continue;

          const { data: expense, error: expErr } = await supabase
            .from('expenses')
            .insert({
              user_id: userId,
              budget_id: budget.id,
              amount,
              name: `🏦 ${desc}`,
              category: categories[i],
              date,
            })
            .select()
            .single();

          if (expErr) {
            console.error('Expense insert error:', expErr);
            continue;
          }

          await supabase.from('bank_synced_transactions').insert({
            bank_connection_id: conn.id,
            account_id,
            transaction_id: txId,
            expense_id: expense.id,
            amount,
            transaction_date: date,
            description: desc,
          });

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
