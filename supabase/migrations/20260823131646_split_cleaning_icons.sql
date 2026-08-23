-- "cloro" y "jabón" compartían el mismo envase celeste que "detergente",
-- pero son productos distintos (cloro es líquido en botella blanca, jabón
-- es una barra). Cada uno pasa a tener su propio ícono.

update public.product_catalog
set icon_key = 'bleach'
where lower(name) = 'cloro' and icon_key = 'cleaning';

update public.product_catalog
set icon_key = 'soap'
where lower(name) = 'jabón' and icon_key = 'cleaning';
