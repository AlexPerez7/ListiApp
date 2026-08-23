-- El catálogo por defecto (lib/productCatalog.ts) traía nombres duplicados
-- del mismo producto: singular + plural (huevo/huevos, hamburguesa/
-- hamburguesas) y con/sin acento (jamón/jamon, café/cafe). Como la cantidad
-- ya se elige al agregar el ítem, el plural sobraba; se limpia el código
-- fuente y esta migración aplica lo mismo a las filas ya sembradas.
--
-- Por cada par (nombre a borrar -> nombre a conservar), si la fila que se
-- borra tenía una foto propia y la que se conserva no, se la transfiere
-- antes de borrar.
do $$
declare
  i int;
  old_name text;
  new_name text;
  pairs text[][] := array[
    ['uvas', 'uva'],
    ['frutillas', 'frutilla'],
    ['ananas', 'ananá'],
    ['papas', 'papa'],
    ['milanesas', 'milanesa'],
    ['jamon', 'jamón'],
    ['hamburguesas', 'hamburguesa'],
    ['medallones', 'medallon'],
    ['salchichas', 'salchicha'],
    ['huevos', 'huevo'],
    ['desodorantes', 'desodorante'],
    ['cafe', 'café'],
    ['te', 'té'],
    ['jabon', 'jabón'],
    ['champu', 'champú'],
    ['papel higienico', 'papel higiénico'],
    ['panales', 'pañales'],
    ['azucar', 'azúcar'],
    ['galletitas', 'galletas']
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

-- Renombres simples (no había una fila con el nombre nuevo todavía).
update public.product_catalog set name = 'factura'
where lower(name) = 'facturas'
  and not exists (
    select 1 from public.product_catalog p2
    where p2.user_id = product_catalog.user_id and lower(p2.name) = 'factura'
  );

update public.product_catalog set name = 'medialuna'
where lower(name) = 'medialunas'
  and not exists (
    select 1 from public.product_catalog p2
    where p2.user_id = product_catalog.user_id and lower(p2.name) = 'medialuna'
  );

update public.product_catalog set name = 'galleta'
where lower(name) = 'galletas'
  and not exists (
    select 1 from public.product_catalog p2
    where p2.user_id = product_catalog.user_id and lower(p2.name) = 'galleta'
  );
