-- "bistec" y "asado" compartían la foto de "carne molida" pero son cortes
-- distintos (carne molida es picada, bistec y asado son piezas enteras).
-- Cada uno pasa a tener su propio ícono. "carne picada" era lo mismo que
-- "carne molida" (se fusiona). "milanesa" se saca del catálogo por defecto
-- (no es un término/producto usado en Chile).

update public.product_catalog
set icon_key = 'steak'
where lower(name) = 'bistec' and icon_key = 'meat';

update public.product_catalog
set icon_key = 'asado'
where lower(name) = 'asado' and icon_key = 'meat';

update public.product_catalog kept
set image_url = dup.image_url
from public.product_catalog dup
where lower(kept.name) = 'carne molida'
  and lower(dup.name) = 'carne picada'
  and kept.user_id = dup.user_id
  and kept.image_url is null
  and dup.image_url is not null;

delete from public.product_catalog where lower(name) in ('carne picada', 'milanesa');
