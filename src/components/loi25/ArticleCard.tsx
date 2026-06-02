import { memo } from "react";
import { BookOpen } from "lucide-react";

export type Loi25Article = {
  id: string;
  numero: string;
  numero_int?: number | null;
  chapitre?: string | null;
  section?: string | null;
  titre?: string | null;
  contenu: string;
  similarity?: number;
};

function highlight(text: string, term?: string) {
  if (!term || term.trim().length < 2) return text;
  const safe = term.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${safe})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === term.trim().toLowerCase() ? (
      <mark key={i} className="rounded bg-amber-200 px-0.5 text-foreground dark:bg-amber-500/40">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const ArticleCardComponent = ({
  article: r,
  highlightTerm,
}: {
  article: Loi25Article;
  highlightTerm?: string;
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <BookOpen className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-serif font-bold text-foreground">
          Article {r.numero} — Loi 25
        </span>
        {r.chapitre && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {r.chapitre}
          </span>
        )}
        {r.section && (
          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
            {r.section}
          </span>
        )}
        {typeof r.similarity === "number" && (
          <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {(r.similarity * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {r.titre && (
        <h3 className="mb-1.5 font-serif text-base font-semibold text-foreground">
          {highlight(r.titre, highlightTerm)}
        </h3>
      )}
      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
        {highlight(r.contenu, highlightTerm)}
      </p>
    </div>
  );
};

export const ArticleCard = memo(ArticleCardComponent);
export default ArticleCard;
