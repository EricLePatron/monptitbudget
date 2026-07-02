import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  invitedEmail: string;
  accountName: string;
  appUrl?: string;
}

// Allowlist of trusted origins the invitation link may point to.
const ALLOWED_ORIGINS = new Set<string>([
  "https://monptitbudget.lovable.app",
  "https://id-preview--c5ba685a-e98a-48e9-b17f-0610da911d2d.lovable.app",
]);
const DEFAULT_APP_URL = "https://monptitbudget.lovable.app";

function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeAppUrl(raw: string | undefined): string {
  if (!raw) return DEFAULT_APP_URL;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return DEFAULT_APP_URL;
    if (!ALLOWED_ORIGINS.has(parsed.origin)) return DEFAULT_APP_URL;
    return parsed.origin + (parsed.pathname === "/" ? "" : parsed.pathname);
  } catch {
    return DEFAULT_APP_URL;
  }
}

function isValidEmail(email: string): boolean {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate caller and derive inviter email from the JWT — never trust the body.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const inviterEmail = String(claimsData.claims.email);

    const body: InvitationEmailRequest = await req.json();
    const invitedEmail = String(body.invitedEmail ?? "").trim();
    const accountName = String(body.accountName ?? "").trim().slice(0, 120);

    if (!isValidEmail(invitedEmail)) {
      return new Response(JSON.stringify({ error: "Invalid invitedEmail" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!accountName) {
      return new Response(JSON.stringify({ error: "Invalid accountName" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const appUrl = sanitizeAppUrl(body.appUrl);

    // Escape all values used in HTML.
    const safeInviter = escapeHtml(inviterEmail);
    const safeAccount = escapeHtml(accountName);
    const safeInvited = escapeHtml(invitedEmail);
    const safeAppUrl = escapeHtml(appUrl);

    console.log(`Sending invitation email to ${invitedEmail} for account "${accountName}" from ${inviterEmail}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Budget App <onboarding@resend.dev>",
        to: [invitedEmail],
        subject: `${inviterEmail} vous a invité à partager un compte budget`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background-color: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                  <div style="text-align: center; margin-bottom: 30px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">💰</div>
                    <h1 style="margin: 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">
                      Invitation à partager un compte
                    </h1>
                  </div>

                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    Bonjour,
                  </p>

                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                    <strong>${safeInviter}</strong> vous a invité à partager le compte budget
                    <strong>"${safeAccount}"</strong>.
                  </p>

                  <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                    En rejoignant ce compte, vous pourrez :
                  </p>

                  <ul style="color: #4a4a4a; font-size: 16px; line-height: 1.8; margin-bottom: 30px; padding-left: 20px;">
                    <li>Voir et gérer le budget partagé</li>
                    <li>Ajouter vos propres dépenses</li>
                    <li>Suivre les dépenses de tous les membres</li>
                  </ul>

                  <div style="text-align: center; margin-bottom: 30px;">
                    <a href="${safeAppUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accéder à l'application
                    </a>
                  </div>

                  <p style="color: #888888; font-size: 14px; line-height: 1.6; text-align: center;">
                    Connectez-vous avec l'adresse <strong>${safeInvited}</strong> pour accéder au compte partagé.
                  </p>
                </div>

                <p style="color: #888888; font-size: 12px; text-align: center; margin-top: 20px;">
                  Cet email a été envoyé automatiquement. Si vous n'êtes pas concerné, vous pouvez l'ignorer.
                </p>
              </div>
            </body>
          </html>
        `,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      console.error("Resend API error:", errorData);
      return new Response(JSON.stringify({ success: false, error: "Failed to send email" }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse?.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-invitation-email function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
