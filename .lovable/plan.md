# Finalisation – Recherche & Conseil pour loi25pro

État actuel : Cloud activé, table `loi25_articles` créée, 102 articles parsés + embeddings générés (1536 dims, `text-embedding-3-small`). Reste à insérer + bâtir l'UI.

## Étapes restantes

### 1. Insérer les 102 articles embeddés
- Utiliser `supabase--insert` par lots de ~20 articles (les INSERT multi-lignes contiennent des newlines, donc passer via `psql -f` sur le fichier `/tmp/loi25_seed.sql` complet en une fois).

### 2. Server functions (TanStack)
- `src/lib/loi25.functions.ts`
  - `searchLoi25({ query, k })` : embed via AI Gateway (`text-embedding-3-small`, 1536 dims) → RPC `match_loi25_articles` → retourne top-K.
  - `listLoi25Articles()` : liste complète pour l'onglet "Explorer la Loi".

### 3. Server route streaming chat
- `src/routes/api/conseil-chat.ts` (POST, SSE)
  - Embed la dernière question utilisateur → top 5 articles → injecte comme contexte dans le prompt système → stream `google/gemini-2.5-flash` via AI Gateway.
  - Format SSE compatible avec le parser ligne-par-ligne (cf. doc Lovable AI).

### 4. Page `/recherche-conseil`
- `src/routes/recherche-conseil.tsx` avec deux onglets (Tabs shadcn) :
  - **Assistant & Recherche** : chat streamé + panneau résultats sémantiques.
  - **Explorer la Loi 25** : liste complète des 102 articles avec recherche/filtre par chapitre, carte par article.
- Composants :
  - `src/components/loi25/ArticleCard.tsx`
  - `src/components/loi25/CodeExplorer.tsx`
  - `src/components/loi25/ChatPanel.tsx`
- Markdown via `react-markdown` (déjà à ajouter si absent).
- `head()` SEO : titre + description FR.

### 5. Navigation
- Ajouter lien "Recherche & Conseil" dans le header de loi25pro (là où sont les autres liens publics).

### 6. QA
- Tester : poser une question → vérifier que le stream arrive token-par-token et que les articles cités s'affichent.
- Vérifier l'onglet Explorer (102 articles visibles, recherche fonctionne).

## Notes techniques
- Embeddings déjà en 1536 dims dans la DB → colonne `vector(1536)` cohérente. On garde `text-embedding-3-small` côté requête pour rester comparable.
- Modèle chat : `google/gemini-2.5-flash` (rapide + bonne qualité FR juridique).
- Aucune Edge Function : tout via `createServerFn` + server route SSE.

Réponds **OK** pour que je passe en mode build et termine.
