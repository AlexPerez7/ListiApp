-- Ajusta el catálogo por defecto (lib/productCatalog.ts) al español de
-- Chile: términos que eran argentinismos (lavandina, gaseosa, morrón,
-- factura/medialuna, bife) o que mezclaban productos distintos bajo el
-- mismo nombre (manteca != mantequilla, zapallo != pepino). Aplica lo
-- mismo a las filas ya sembradas en Supabase.

-- limón tenía el mismo ícono que naranja/mandarina; ahora tiene el suyo.
update public.product_catalog
set icon_key = 'lemon'
where lower(name) = 'limon' and icon_key = 'citrus';

-- Fusiones: "ananá" ya no se usa (queda solo "piña"). Si la fila borrada
-- tenía foto propia y la que se conserva no, se la transfiere primero.
do $$
declare
  i int;
  old_name text;
  new_name text;
  pairs text[][] := array[
    ['ananá', 'piña']
  ];
begin
  for i in 1 .. array_length(pairs, 1) loop
    old_name := pairs[i][1];
    new_name := pairs[i][2];

    update public.product_catalog kept
    set image_url = dup.image_url
    from public.product_catalog dup
    where lower(kept.name) = lower(new_name)
      and lower(dup.name) = lower(old_name)
      and kept.user_id = dup.user_id
      and kept.image_url is null
      and dup.image_url is not null;

    delete from public.product_catalog where lower(name) = lower(old_name);
  end loop;
end $$;

-- Renombres (mismo producto, término chileno en vez de argentino).
do $$
declare
  i int;
  old_name text;
  new_name text;
  pairs text[][] := array[
    ['lavandina', 'cloro'],
    ['salchicha', 'vienesa'],
    ['gaseosa', 'bebida'],
    ['morron', 'pimenton'],
    ['bife', 'bistec']
  ];
begin
  for i in 1 .. array_length(pairs, 1) loop
    old_name := pairs[i][1];
    new_name := pairs[i][2];

    update public.product_catalog
    set name = new_name
    where lower(name) = lower(old_name)
      and not exists (
        select 1 from public.product_catalog p2
        where p2.user_id = product_catalog.user_id and lower(p2.name) = lower(new_name)
      );
  end loop;
end $$;

-- Productos que no correspondían (no una variante regional, sino un
-- producto distinto mal agrupado): se borran sin fusionar nada.
delete from public.product_catalog where lower(name) in ('manteca', 'factura', 'medialuna', 'zapallo', 'zapallito');
