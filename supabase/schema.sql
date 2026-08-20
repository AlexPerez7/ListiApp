-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar todo > Run

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
insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
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

-- Migración: si ya corriste este script antes de que existieran las columnas
-- category/price/position, corré solo este bloque (podés pegarlo solo, es
-- idempotente).
alter table public.items add column if not exists category text;
alter table public.items add column if not exists price numeric(10, 2);
alter table public.items add column if not exists position bigint not null default 0;

update public.items
set position = sub.rn
from (
  select id, row_number() over (partition by list_id order by created_at) as rn
  from public.items
) sub
where public.items.id = sub.id and public.items.position = 0;

-- Migración: tabla de categorías editables (con ícono propio) en reemplazo
-- del texto libre en items.category. Corré este bloque si ya tenías el
-- schema con la columna items.category (texto) — es idempotente.
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  icon text not null default '🏷️',
  position bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories (user_id);
alter table public.categories replica identity full;
alter table public.categories enable row level security;

drop policy if exists "Users can manage their own categories" on public.categories;
create policy "Users can manage their own categories"
  on public.categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;
end $$;

alter table public.items add column if not exists category_id uuid references public.categories (id) on delete set null;
create index if not exists items_category_id_idx on public.items (category_id);

-- Crea una categoría por cada nombre distinto ya usado en items.category y
-- enlaza los ítems correspondientes por category_id.
insert into public.categories (user_id, name)
select distinct lists.user_id, items.category
from public.items
join public.lists on lists.id = items.list_id
where items.category is not null and items.category_id is null;

update public.items
set category_id = categories.id
from public.categories, public.lists
where public.items.category = categories.name
  and public.items.category_id is null
  and public.lists.id = public.items.list_id
  and public.lists.user_id = categories.user_id;

alter table public.items drop column if exists category;

-- Migración: foto por ítem. Corré este bloque si ya tenías el schema sin
-- la columna items.image_url ni el bucket de Storage — es idempotente.
alter table public.items add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('item-images', 'item-images', true)
on conflict (id) do nothing;

drop policy if exists "Users can read their own item images" on storage.objects;
create policy "Users can read their own item images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can upload their own item images" on storage.objects;
create policy "Users can upload their own item images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can update their own item images" on storage.objects;
create policy "Users can update their own item images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users can delete their own item images" on storage.objects;
create policy "Users can delete their own item images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'item-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
