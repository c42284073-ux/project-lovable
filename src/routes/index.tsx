import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, MessageSquare, Library } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Loi25Pro — Conformité Loi 25 du Québec" },
      {
        name: "description",
        content:
          "Outil de conformité à la Loi 25 (P-39.1) du Québec : assistant IA, recherche sémantique et exploration complète du texte officiel.",
      },
      { property: "og:title", content: "Loi25Pro — Conformité Loi 25" },
      {
        property: "og:description",
        content:
          "Assistant IA et exploration de la Loi 25 du Québec pour les responsables conformité.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 text-primary" />
          Loi 25 — Québec (P-39.1)
        </div>
        <h1 className="font-serif text-4xl font-bold text-foreground md:text-5xl">
          Loi25Pro
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Votre copilote de conformité à la Loi sur la protection des
          renseignements personnels dans le secteur privé.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link
            to="/recherche-conseil"
            className="group rounded-2xl border border-border bg-card p-6 text-left transition-shadow hover:shadow-md"
          >
            <MessageSquare className="mb-3 h-6 w-6 text-primary" />
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Recherche &amp; Conseil
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Posez votre question à l'assistant IA et obtenez des réponses
              appuyées sur les articles officiels.
            </p>
          </Link>

          <Link
            to="/recherche-conseil"
            className="group rounded-2xl border border-border bg-card p-6 text-left transition-shadow hover:shadow-md"
          >
            <Library className="mb-3 h-6 w-6 text-primary" />
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Explorer la Loi 25
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Parcourez l'intégralité du texte officiel, article par article.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
