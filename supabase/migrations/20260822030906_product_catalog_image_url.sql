-- Permite subir una foto real para un producto del catálogo (además de
-- elegir entre los íconos ilustrados), igual que ya se puede en los ítems.
alter table public.product_catalog add column image_url text;
