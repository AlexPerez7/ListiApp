-- "atún" normalmente se refiere al enlatado, no al pescado fresco (que ya
-- cubre "pescado"), así que pasa a tener su propio ícono en vez de
-- compartir el de "fish".
update public.product_catalog
set icon_key = 'tuna'
where lower(name) = 'atun' and icon_key = 'fish';

-- "yogur" y "yogurt" son el mismo producto; se conserva "yogurt".
update public.product_catalog kept
set image_url = dup.image_url
from public.product_catalog dup
where lower(kept.name) = 'yogurt'
  and lower(dup.name) = 'yogur'
  and kept.user_id = dup.user_id
  and kept.image_url is null
  and dup.image_url is not null;

delete from public.product_catalog where lower(name) = 'yogur';
