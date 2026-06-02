
# Page "Recherche & Conseil" pour loi25pro

On reprend exactement la page de JurisScan (chat IA + recherche sémantique + explorateur de Code) et on remplace le **Code de la sécurité routière** par la **Loi 25 / LPRPSP** (texte complet).

## Ce qui sera livré

1. **Page `/recherche-conseil`** — même UI/UX que JurisScan :
   - Onglet **« Assistant & Recherche »** : chat IA empathique (réponses en streaming) + barre de recherche sémantique sous le chat.
   - Onglet **« Explorer la Loi »** : navigation complète de la Loi 25 (chapitres → sections → articles).
2. **Lien dans la navigation** depuis l'accueil et le dashboard.
3. **Base de données** contenant **tous les articles de la Loi 25** (texte intégral, FR).
4. **Recherche sémantique** sur ces articles (embeddings vectoriels).
5. **Chat conseil IA** qui répond en s'appuyant sur les articles trouvés (RAG).

## Source légale utilisée

- **Loi sur la protection des renseignements personnels dans le secteur privé** (RLRQ, c. P-39.1), telle que modifiée par la Loi 25 — source publique LégisQuébec.
- Découpée article par article, avec numéro, chapitre, section, titre.

## Étapes

```text
1. Activer Lovable Cloud
   └── DB Postgres + pgvector + AI Gateway (chat/streaming + embeddings)

2. Migration SQL
   ├── table loi25_articles (id, numero, chapitre, section, titre, contenu, embedding vector)
   ├── index ivfflat sur embedding
   ├── RLS : SELECT public (anon + authenticated)
   └── RPC match_loi25_articles(query_embedding, match_count)

3. Ingestion du texte
   ├── Script d'import : ~110 articles de P-39.1 (texte complet)
   ├── Génération des embeddings via AI Gateway
   └── Exécuté une fois au déploiement

4. Server functions (TanStack Start)
   ├── search-loi25 : POST { query } → top-K articles
   └── conseil-chat : POST { messages } → flux SSE (streaming)

5. UI (port 1:1 depuis JurisScan)
   ├── src/routes/recherche-conseil.tsx
   ├── src/components/loi25/ArticleCard.tsx
   ├── src/components/loi25/CodeExplorer.tsx
   └── Lien ajouté dans __root.tsx (header)

6. SEO + métadonnées
   └── head() avec title/description FR
```

## Détails techniques

- **Stack** : TanStack Start + Vite + Lovable Cloud (Supabase managé) + Lovable AI Gateway.
- **Différences avec JurisScan** (qui est en Vite + React Router) :
  - Routing : `src/pages/RechercheConseil.tsx` → `src/routes/recherche-conseil.tsx` (file-based).
  - Backend : Edge Functions Supabase → **server functions TanStack** (`createServerFn` + route `/api/...` pour le streaming).
  - Le composant chat/search reste **identique visuellement** (mêmes classes Tailwind, même structure, même framer-motion).
- **Pas de dépendance au "constat scanné"** (spécifique à JurisScan) — on retire ce bout, le reste est identique.
- **Streaming SSE** via une route `src/routes/api/conseil-chat.ts` (Response streamée).

## Hors périmètre (pour rester ciblé)

- Pas de modification des autres pages de loi25pro.
- Pas de port des autres modules du zip loi25pro-main (consentements, incidents, EFVP, etc.) — uniquement cette page.
- Pas d'auth requise pour utiliser la page (publique, comme dans JurisScan).

## Confirmation nécessaire avant build

1. **OK pour activer Lovable Cloud** dans loi25pro ? (obligatoire pour DB + IA + embeddings)
2. **OK pour utiliser le texte officiel de P-39.1** (LégisQuébec) comme corpus de la « Loi 25 au complet » ?
