-- Nuevo producto en el catálogo por defecto: ají cayena (foto real
-- agregada en lib/productIcons.tsx). Se inserta para los usuarios que ya
-- tenían su catálogo sembrado antes de este cambio.
insert into public.product_catalog (user_id, name, icon_key)
select distinct user_id, 'ají cayena', 'cayenne'
from public.product_catalog p
where not exists (
  select 1 from public.product_catalog p2
  where p2.user_id = p.user_id and lower(p2.name) = 'ají cayena'
);
