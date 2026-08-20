-- Ejecutar en Supabase: Project > SQL Editor > New query > pegar todo > Run

create extension if not exists pgcrypto;

create table public.lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  name text not null,
  quantity text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index items_list_id_idx on public.items (list_id);
create index lists_user_id_idx on public.lists (user_id);

-- Necesario para que los eventos DELETE de Realtime incluyan la fila completa
-- (por defecto solo incluyen la clave primaria), usado para mergear cambios sin refetch.
alter table public.lists replica identity full;
alter table public.items replica identity full;

alter table public.lists enable row level security;
alter table public.items enable row level security;

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

alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.items;
