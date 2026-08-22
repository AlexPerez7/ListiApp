-- Catálogo de productos predefinidos, antes una lista fija en el código
-- (lib/productCatalog.ts). Ahora vive en la base para que cada usuario
-- pueda agregar, renombrar o borrar sus propios productos y elegir qué
-- ícono le corresponde, igual que ya pasa con las categorías.
create table public.product_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  icon_key text not null,
  created_at timestamptz not null default now()
);

create unique index product_catalog_user_name_idx on public.product_catalog (user_id, lower(name));
create index product_catalog_user_id_idx on public.product_catalog (user_id);

alter table public.product_catalog replica identity full;
alter table public.product_catalog enable row level security;

create policy "Users can manage their own product catalog"
  on public.product_catalog
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.product_catalog;
