-- deleteItemImage (lib/imageUpload.ts) busca por coincidencia parcial de
-- image_url (LIKE '%path%') para saber si otro item o product_photos sigue
-- usando la misma foto antes de borrarla de Storage. Un índice B-tree normal
-- no sirve para LIKE con comodín al principio, así que se hace sequential
-- scan en cada borrado/reemplazo de foto. Un índice GIN de trigramas sí
-- acelera ese patrón de búsqueda.
create extension if not exists pg_trgm;

create index if not exists items_image_url_trgm_idx
  on public.items using gin (image_url gin_trgm_ops);

create index if not exists product_photos_image_url_trgm_idx
  on public.product_photos using gin (image_url gin_trgm_ops);
