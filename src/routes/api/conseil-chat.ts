import { createFileRoute } from "@tanstack/react-router";

const SYSTEM_PROMPT = `Tu es un assistant juridique spécialisé dans la Loi 25 du Québec (Loi sur la protection des renseignements personnels dans le secteur privé, P-39.1).

Ton rôle : aider les entreprises, DPO et responsables de la conformité à comprendre leurs obligations, en français clair, structuré et empathique.

Règles strictes :
- Réponds toujours en français.
- Appuie-toi UNIQUEMENT sur les articles de la Loi 25 fournis dans le contexte ci-dessous.
- Cite explicitement les articles utilisés (ex. : « Selon l'article 3.2 de la Loi 25, ... »).
- Si la question sort du cadre des articles fournis, dis-le clairement et propose de reformuler.
- Utilise du Markdown : titres courts, listes à puces, **gras** pour les points importants.
- Termine systématiquement par : « Information juridique générale — ne remplace pas l'avis d'un avocat. »`;

async function embed(text: string, apiKey: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "openai/text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`embed ${res.status}`);
  const j = await res.json();
  return j.data[0].embedding as number[];
}

export const Route = createFileRoute("/api/conseil-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) {
            return new Response(JSON.stringify({ error: "AI non configurée" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          const body = (await request.json()) as {
            messages: { role: "user" | "assistant"; content: string }[];
          };
          const messages = Array.isArray(body.messages) ? body.messages : [];
          const lastUser = [...messages].reverse().find((m) => m.role === "user");
          if (!lastUser) {
            return new Response(JSON.stringify({ error: "Aucune question" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          // Retrieve relevant articles
          let contextBlock = "";
          try {
            const vec = await embed(lastUser.content.slice(0, 2000), apiKey);
            const { supabaseAdmin } = await import(
              "@/integrations/supabase/client.server"
            );
            const { data: rows } = await supabaseAdmin.rpc(
              "match_loi25_articles",
              { query_embedding: vec as unknown as string, match_count: 5 },
            );
            if (rows && rows.length) {
              contextBlock = rows
                .map(
                  (r: { numero: string; titre: string | null; contenu: string }) =>
                    `### Article ${r.numero}${r.titre ? ` — ${r.titre}` : ""}\n${r.contenu}`,
                )
                .join("\n\n");
            }
          } catch (e) {
            console.error("retrieval failed", e);
          }

          const systemContent =
            SYSTEM_PROMPT +
            (contextBlock
              ? `\n\n# Articles pertinents de la Loi 25 :\n\n${contextBlock}`
              : "");

          const aiRes = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                stream: true,
                messages: [
                  { role: "system", content: systemContent },
                  ...messages,
                ],
              }),
            },
          );

          if (!aiRes.ok) {
            if (aiRes.status === 429) {
              return new Response(
                JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }),
                { status: 429, headers: { "Content-Type": "application/json" } },
              );
            }
            if (aiRes.status === 402) {
              return new Response(
                JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits." }),
                { status: 402, headers: { "Content-Type": "application/json" } },
              );
            }
            const t = await aiRes.text();
            console.error("AI gateway error", aiRes.status, t);
            return new Response(JSON.stringify({ error: "Assistant indisponible" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(aiRes.body, {
            headers: { "Content-Type": "text/event-stream" },
          });
        } catch (e) {
          console.error(e);
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Erreur" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
