-- Fix linter warnings
create schema if not exists extensions;
alter extension vector set schema extensions;

create or replace function public.match_loi25_articles(
  query_embedding extensions.vector(1536),
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
set search_path = public, extensions
as $$
  select a.id, a.numero, a.numero_int, a.chapitre, a.section, a.titre, a.contenu,
         1 - (a.embedding <=> query_embedding) as similarity
  from public.loi25_articles a
  where a.embedding is not null
  order by a.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_loi25_articles(extensions.vector, int) to anon, authenticated, service_role;