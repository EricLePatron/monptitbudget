import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  invitedEmail: string;
  accountName: string;
  inviterEmail: string;
  appUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitedEmail, accountName, inviterEmail, appUrl }: InvitationEmailRequest = await req.json();

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
                    <strong>${inviterEmail}</strong> vous a invité à partager le compte budget 
                    <strong>"${accountName}"</strong>.
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
                    <a href="${appUrl}" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Accéder à l'application
                    </a>
                  </div>
                  
                  <p style="color: #888888; font-size: 14px; line-height: 1.6; text-align: center;">
                    Connectez-vous avec l'adresse <strong>${invitedEmail}</strong> pour accéder au compte partagé.
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
      throw new Error(errorData.message || "Failed to send email");
    }

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-invitation-email function:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
