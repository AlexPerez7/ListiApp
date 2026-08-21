-- Recuerda la última foto que el usuario subió para un producto (por nombre
-- normalizado), para autocompletarla si vuelve a agregar el mismo producto
-- en esta lista o en otra, en vez de tener que subirla de nuevo.
create table public.product_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name_key text not null,
  image_url text not null,
  updated_at timestamptz not null default now(),
  unique (user_id, name_key)
);

alter table public.product_photos enable row level security;

create policy "Users can manage their own product photos"
  on public.product_photos
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
