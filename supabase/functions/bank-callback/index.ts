// Edge function: bank-callback
// Échange le code d'autorisation contre un session_id Enable Banking et persiste la connexion
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

  const pemBody = privateKeyPem
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8', binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, encoder.encode(signingInput));
  return `${signingInput}.${b64url(new Uint8Array(signature))}`;
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

    const { code, account_id } = await req.json();
    if (!code || !account_id) {
      return new Response(JSON.stringify({ error: 'code and account_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('ENABLE_BANKING_APP_ID')!;
    const privateKey = Deno.env.get('ENABLE_BANKING_PRIVATE_KEY')!;
    const jwt = await generateJWT(appId, privateKey);

    // Échange du code contre une session
    const sessionRes = await fetch(`${ENABLE_BANKING_BASE}/sessions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!sessionRes.ok) {
      const errText = await sessionRes.text();
      console.error('Session creation failed:', errText);
      return new Response(JSON.stringify({ error: 'Failed to create session', details: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionData = await sessionRes.json();
    const sessionId = sessionData.session_id;
    const accounts = sessionData.accounts || [];
    const aspsp = sessionData.aspsp || {};
    const accessValidUntil = sessionData.access?.valid_until || new Date(Date.now() + 180 * 86400000).toISOString();

    if (accounts.length === 0) {
      return new Response(JSON.stringify({ error: 'No accounts found in session' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Stocker chaque compte bancaire détecté
    const insertedConnections = [];
    for (const acc of accounts) {
      const { data, error } = await supabase
        .from('bank_connections')
        .insert({
          account_id,
          user_id: userId,
          session_id: sessionId,
          bank_name: aspsp.name || 'Banque',
          bank_country: aspsp.country || null,
          bank_account_id: acc.uid || acc.account_id?.iban || null,
          bank_account_iban: acc.account_id?.iban || null,
          bank_account_name: acc.product || acc.name || null,
          valid_until: accessValidUntil,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Insert connection error:', error);
        continue;
      }
      insertedConnections.push(data);
    }

    return new Response(JSON.stringify({
      success: true,
      connections: insertedConnections,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('bank-callback error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
