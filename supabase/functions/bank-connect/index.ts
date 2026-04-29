// Edge function: bank-connect
// Initie une session Enable Banking pour la Caisse d'Épargne
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ENABLE_BANKING_BASE = 'https://api.enablebanking.com';

// Génère un JWT RS256 signé pour Enable Banking
async function generateJWT(appId: string, privateKeyPem: string): Promise<string> {
  const header = { typ: 'JWT', alg: 'RS256', kid: appId };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const b64url = (data: Uint8Array | string) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    return btoa(String.fromCharCode(...bytes))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  };

  const headerB64 = b64url(JSON.stringify(header));
  const payloadB64 = b64url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Parse PEM PKCS8
  const pemBody = privateKeyPem
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    encoder.encode(signingInput)
  );

  const signatureB64 = b64url(new Uint8Array(signature));
  return `${signingInput}.${signatureB64}`;
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

    const body = await req.json();
    const { account_id, redirect_url, country = 'FR' } = body;

    if (!account_id || !redirect_url) {
      return new Response(JSON.stringify({ error: 'account_id and redirect_url required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const appId = Deno.env.get('ENABLE_BANKING_APP_ID');
    const privateKey = Deno.env.get('ENABLE_BANKING_PRIVATE_KEY');
    if (!appId || !privateKey) {
      return new Response(JSON.stringify({ error: 'Enable Banking credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = await generateJWT(appId, privateKey);

    // Récupère la liste des ASPSPs (banques) pour trouver Caisse d'Épargne
    const aspspsRes = await fetch(`${ENABLE_BANKING_BASE}/aspsps?country=${country}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!aspspsRes.ok) {
      const errText = await aspspsRes.text();
      console.error('ASPSPs fetch failed:', errText);
      return new Response(JSON.stringify({ error: 'Failed to fetch banks', details: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aspspsData = await aspspsRes.json();
    const banks = aspspsData.aspsps || [];

    // Si une banque spécifique est demandée
    const { bank_name } = body;
    let selectedBank = banks.find((b: { name: string }) =>
      bank_name ? b.name.toLowerCase().includes(bank_name.toLowerCase()) : b.name.toLowerCase().includes('caisse')
    );

    if (!selectedBank && !bank_name) {
      // Retourne la liste pour que l'user choisisse
      return new Response(JSON.stringify({
        needs_bank_selection: true,
        banks: banks.map((b: { name: string; country: string; logo: string }) => ({
          name: b.name, country: b.country, logo: b.logo,
        })),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!selectedBank) {
      return new Response(JSON.stringify({ error: 'Bank not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crée une session d'authentification
    const validUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const state = crypto.randomUUID();

    const authRes = await fetch(`${ENABLE_BANKING_BASE}/auth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access: {
          valid_until: validUntil,
        },
        aspsp: { name: selectedBank.name, country: selectedBank.country },
        state: `${state}|${account_id}`,
        redirect_url,
        psu_type: 'personal',
      }),
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      console.error('Auth session creation failed:', errText);
      return new Response(JSON.stringify({ error: 'Failed to create auth session', details: errText }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authData = await authRes.json();

    return new Response(JSON.stringify({
      auth_url: authData.url,
      bank: { name: selectedBank.name, country: selectedBank.country, logo: selectedBank.logo },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('bank-connect error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
