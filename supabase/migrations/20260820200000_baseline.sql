-- Baseline: estado final del schema tal como quedó documentado en
-- supabase/schema.sql (que incluía varios bloques de migración manual
-- ya aplicados). Este archivo NO se corre contra la base ya existente
-- (los objetos ya están creados) — se marca como aplicado con
-- `supabase migration repair --status applied 20260820200000` al linkear
-- el proyecto. De acá en adelante, los cambios de schema se hacen con
-- `supabase migration new <nombre>` + `supabase db push`, no editando
-- este archivo ni schema.sql.

create extension if not exists pgcrypto;

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '🏷️',
  position bigint not null default 0,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  quantity text,
  price numeric(10, 2),
  image_url text,
  position bigint not null default 0,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index items_list_id_idx on public.items (list_id);
create index items_category_id_idx on public.items (category_id);
create index lists_user_id_idx on public.lists (user_id);
create index categories_user_id_idx on public.categories (user_id);

-- Necesario para que los eventos DELETE de Realtime incluyan la fila completa
-- (por defecto solo incluyen la clave primaria), usado para mergear cambios sin refetch.
alter table public.lists replica identity full;
alter table public.items replica identity full;
alter table public.categories replica identity full;

alter table public.lists enable row level security;
alter table public.items enable row level security;
alter table public.categories enable row level security;

create policy "Users can manage their own lists"
  on public.lists
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage items in their own lists"
  on public.items
  for all
  using (exists (
    select 1 from public.lists
    where lists.id = items.list_id and lists.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.lists
    where lists.id = items.list_id and lists.user_id = auth.uid()
  ));

create policy "Users can manage their own categories"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.categories;

-- Bucket de Storage para las fotos de los ítems. Público de solo lectura:
-- cualquiera con la URL puede ver la imagen, pero solo el dueño puede
-- subir/reemplazar/borrar sus propias fotos (carpeta = su user_id).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

-- La policy de select es necesaria aunque el bucket sea publico: al subir
-- con upsert (reemplazar una foto ya existente), Postgres hace un
-- INSERT ... ON CONFLICT DO UPDATE, y para eso RLS necesita poder "ver"
-- la fila existente via una policy de select, si no el update-por-conflicto
-- se rechaza con "new row violates row-level security policy".
create policy "Users can read their own item images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can upload their own item images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can update their own item images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users can delete their own item images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
