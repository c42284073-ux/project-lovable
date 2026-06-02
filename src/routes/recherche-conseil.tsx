import { useState, useRef, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  Shield,
  BookOpen,
  Send,
  MessageSquare,
  Bot,
  User,
  Library,
  ArrowLeft,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { searchLoi25 } from "@/lib/loi25.functions";
import { ArticleCard, type Loi25Article } from "@/components/loi25/ArticleCard";
import CodeExplorer from "@/components/loi25/CodeExplorer";

export const Route = createFileRoute("/recherche-conseil")({
  head: () => ({
    meta: [
      { title: "Recherche & Conseil | Loi25Pro" },
      {
        name: "description",
        content:
          "Assistant IA, recherche sémantique et exploration complète de la Loi 25 (P-39.1) du Québec.",
      },
      { property: "og:title", content: "Recherche & Conseil | Loi25Pro" },
      {
        property: "og:description",
        content:
          "Posez votre question sur la Loi 25 ou explorez l'intégralité du texte officiel.",
      },
    ],
  }),
  component: RechercheConseilPage,
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Page indisponible</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  notFoundComponent: () => <div>Page introuvable.</div>,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

function RechercheConseilPage() {
  const searchFn = useServerFn(searchLoi25);

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<Loi25Article[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchFn({ data: { query: trimmed, matchCount: 5 } });
      setResults((res.results ?? []) as Loi25Article[]);
    } catch (err) {
      setResults([]);
      toast.error("Échec de la recherche", {
        description: err instanceof Error ? err.message : "Réessayez.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || thinking) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);

    try {
      const res = await fetch("/api/conseil-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok || !res.body) {
        let msg = "L'assistant est indisponible. Réessayez.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const json = JSON.parse(payload);
            const delta = json?.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assistantText += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: assistantText };
                return copy;
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      if (!assistantText) {
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: "Je n'ai pas pu générer de réponse. Réessayez.",
          };
          return copy;
        });
      }
    } catch (err) {
      setMessages((prev) =>
        prev.filter(
          (m, i) =>
            !(i === prev.length - 1 && m.role === "assistant" && m.content === ""),
        ),
      );
      toast.error("Échec de l'assistant", {
        description: err instanceof Error ? err.message : "Réessayez.",
      });
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Accueil
          </Link>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Loi25Pro
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 md:py-16">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Loi 25 — Protection des renseignements personnels (P-39.1)
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">
            Recherche &amp; Conseil
          </h1>
          <p className="mt-3 text-muted-foreground">
            Posez votre question à l'assistant ou explorez l'intégralité de la Loi 25 du Québec.
          </p>
        </motion.header>

        <Tabs defaultValue="assistant" className="w-full">
          <TabsList className="mx-auto grid w-full max-w-2xl grid-cols-2">
            <TabsTrigger value="assistant" className="gap-2">
              <MessageSquare className="h-4 w-4" /> Assistant &amp; Recherche
            </TabsTrigger>
            <TabsTrigger value="explorer" className="gap-2">
              <Library className="h-4 w-4" /> Explorer la Loi
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="assistant"
            className="mx-auto mt-6 max-w-3xl space-y-8"
          >
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div
                ref={scrollRef}
                className="h-[24rem] space-y-4 overflow-y-auto p-4 md:p-5"
              >
                {messages.length === 0 && !thinking ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                    <Bot className="h-10 w-10 text-primary" />
                    <p className="max-w-sm text-sm">
                      Décrivez votre situation — par exemple : « Quel consentement
                      faut-il pour collecter l'adresse courriel d'un client ? »
                      L'assistant s'appuiera sur les articles officiels de la Loi 25.
                    </p>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${
                        m.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {m.role === "assistant" && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      {m.role === "user" ? (
                        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                          {m.content}
                        </div>
                      ) : (
                        <div className="prose prose-sm dark:prose-invert prose-p:my-2 prose-headings:font-serif max-w-[85%] text-sm leading-relaxed text-foreground">
                          <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                        </div>
                      )}
                      {m.role === "user" && (
                        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))
                )}

                {thinking &&
                  messages[messages.length - 1]?.role === "user" && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyse de votre situation…
                      </div>
                    </div>
                  )}
              </div>

              <form
                onSubmit={handleSend}
                className="flex items-end gap-2 border-t border-border p-3"
              >
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Décrivez votre situation…"
                  rows={1}
                  className="max-h-32 min-h-[44px] resize-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={thinking || !input.trim()}
                >
                  {thinking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>

            <div>
              <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold text-foreground">
                <Search className="h-4 w-4 text-primary" /> Recherche intelligente
              </h2>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex : Quelles sont les obligations en cas d'incident de confidentialité ?"
                    className="pl-9"
                    maxLength={1000}
                  />
                </div>
                <Button type="submit" disabled={loading || !query.trim()}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Rechercher"
                  )}
                </Button>
              </form>

              <div className="mt-6">
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground"
                    >
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm">Recherche des articles pertinents…</p>
                    </motion.div>
                  ) : results.length > 0 ? (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="space-y-4"
                    >
                      {results.map((r) => (
                        <ArticleCard key={r.id} article={r} />
                      ))}
                    </motion.div>
                  ) : searched ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-dashed border-border bg-card/50 py-12 text-center"
                    >
                      <p className="font-semibold text-foreground">Aucun résultat</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Reformulez votre question pour des résultats plus pertinents.
                      </p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="hint"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-2xl border border-dashed border-border bg-card/30 py-10 text-center text-sm text-muted-foreground"
                    >
                      <BookOpen className="mx-auto mb-2 h-6 w-6 text-primary/70" />
                      Lancez une recherche pour trouver les articles les plus pertinents.
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="explorer" className="mt-6">
            <CodeExplorer />
          </TabsContent>
        </Tabs>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Information juridique générale — ne remplace pas l'avis d'un avocat.
        </p>
      </main>
    </div>
  );
}
