import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Library, X, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { listLoi25Articles } from "@/lib/loi25.functions";
import { ArticleCard, type Loi25Article } from "./ArticleCard";

function useDebounced<T>(value: T, delay = 250) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

export default function CodeExplorer() {
  const listFn = useServerFn(listLoi25Articles);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["loi25-articles"],
    queryFn: () => listFn(),
    staleTime: 5 * 60_000,
  });

  const articles = (data?.articles ?? []) as Loi25Article[];

  const [search, setSearch] = useState("");
  const debounced = useDebounced(search.trim().toLowerCase(), 250);
  const [chapitre, setChapitre] = useState<string | null>(null);

  const chapitres = useMemo(() => {
    const s = new Set<string>();
    articles.forEach((a) => {
      if (a.chapitre) s.add(a.chapitre);
    });
    return Array.from(s).sort();
  }, [articles]);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      if (chapitre && a.chapitre !== chapitre) return false;
      if (debounced.length >= 2) {
        const hay = `${a.numero} ${a.titre ?? ""} ${a.contenu}`.toLowerCase();
        if (!hay.includes(debounced)) return false;
      }
      return true;
    });
  }, [articles, chapitre, debounced]);

  return (
    <div className="rounded-2xl border border-border bg-card/40">
      <div className="border-b border-border p-3 md:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un numéro d'article (ex: 3.2) ou un mot-clé (ex: consentement)…"
            className="pl-9 pr-9"
            maxLength={120}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Effacer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[16rem_1fr]">
        <aside className="border-b border-border md:border-b-0 md:border-r">
          <div className="flex items-center gap-2 px-4 pt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Library className="h-3.5 w-3.5" /> Chapitres
          </div>
          <div className="max-h-[20rem] overflow-y-auto p-3 md:max-h-[40rem]">
            <button
              type="button"
              onClick={() => setChapitre(null)}
              className={`mb-1 block w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors ${
                chapitre === null
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              Tous les articles
            </button>
            {chapitres.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChapitre(c)}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  chapitre === c
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0">
          <div className="border-b border-border px-4 py-2.5 text-sm font-medium text-foreground">
            {chapitre ?? "Tous les articles"}
            {!isLoading && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {filtered.length} article{filtered.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="h-[28rem] space-y-4 overflow-y-auto p-4 md:h-[40rem]">
            {isLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm">Chargement des articles…</p>
              </div>
            ) : isError ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <FileText className="h-10 w-10" />
                <p className="text-sm">Impossible de charger la Loi 25.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <p className="font-semibold text-foreground">Aucun article</p>
                <p className="text-sm">Aucun résultat pour ce filtre.</p>
              </div>
            ) : (
              filtered.map((a) => (
                <ArticleCard
                  key={a.id}
                  article={a}
                  highlightTerm={debounced.length >= 2 ? debounced : undefined}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
