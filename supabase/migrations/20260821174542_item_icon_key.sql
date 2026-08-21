-- Permite elegir a mano uno de los íconos del catálogo (ver
-- components/ProductIcon.tsx) para un ítem, en vez de depender solo de la
-- detección automática por nombre o de subir una foto.
alter table public.items add column icon_key text;
