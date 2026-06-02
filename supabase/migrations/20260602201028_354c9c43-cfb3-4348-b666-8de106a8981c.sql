-- pgvector + Loi 25 articles
create extension if not exists vector;

create table if not exists public.loi25_articles (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  numero_int integer,
  chapitre text,
  section text,
  titre text,
  contenu text not null,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create unique index if not exists loi25_articles_numero_key on public.loi25_articles (numero);
create index if not exists loi25_articles_numero_int_idx on public.loi25_articles (numero_int);
create index if not exists loi25_articles_embedding_idx
  on public.loi25_articles using ivfflat (embedding vector_cosine_ops) with (lists = 100);

grant select on public.loi25_articles to anon, authenticated;
grant all on public.loi25_articles to service_role;

alter table public.loi25_articles enable row level security;

drop policy if exists "Loi25 articles are public" on public.loi25_articles;
create policy "Loi25 articles are public"
  on public.loi25_articles for select
  to anon, authenticated
  using (true);

-- Semantic search RPC
create or replace function public.match_loi25_articles(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  numero text,
  numero_int integer,
  chapitre text,
  section text,
  titre text,
  contenu text,
  similarity float
)
language sql stable
as $$
  select a.id, a.numero, a.numero_int, a.chapitre, a.section, a.titre, a.contenu,
         1 - (a.embedding <=> query_embedding) as similarity
  from public.loi25_articles a
  where a.embedding is not null
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_loi25_articles(vector, int) to anon, authenticated, service_role;