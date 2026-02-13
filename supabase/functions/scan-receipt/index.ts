import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `Tu es un assistant spécialisé dans l'extraction de données de tickets de caisse.
Extrais les informations suivantes du ticket de caisse en image :
- total: le montant total (nombre décimal, ex: 12.50)
- name: le nom du commerce ou magasin
- date: la date au format YYYY-MM-DD si visible
- items: un tableau des articles avec nom et prix si lisibles

Réponds UNIQUEMENT en JSON valide, sans markdown, sans backticks. Exemple :
{"total": 23.50, "name": "Carrefour", "date": "2025-01-15", "items": [{"name": "Pain", "price": 1.20}]}

Si tu ne peux pas lire une information, mets null pour ce champ.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extrais les informations de ce ticket de caisse.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`AI Gateway call failed [${response.status}]: ${errorBody}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse the JSON response from AI
    let parsed;
    try {
      // Remove potential markdown code blocks
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ error: "Could not parse receipt data", raw: content }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error scanning receipt:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
