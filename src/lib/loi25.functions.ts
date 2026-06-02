import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SearchInput = z.object({
  query: z.string().min(2).max(1000),
  matchCount: z.number().int().min(1).max(20).default(5),
});

async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding failed: ${res.status} ${t}`);
  }
  const j = await res.json();
  return j.data[0].embedding as number[];
}

export const searchLoi25 = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const vec = await embed(data.query);
    const { data: rows, error } = await supabaseAdmin.rpc("match_loi25_articles", {
      query_embedding: vec as unknown as string,
      match_count: data.matchCount,
    });
    if (error) throw new Error(error.message);
    return { results: rows ?? [] };
  });

export const listLoi25Articles = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("loi25_articles")
      .select("id, numero, numero_int, chapitre, section, titre, contenu")
      .order("numero_int", { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return { articles: data ?? [] };
  },
);
