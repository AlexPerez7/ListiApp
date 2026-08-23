-- "ají cayena" pasa a llamarse solo "ají".
update public.product_catalog
set name = 'ají'
where lower(name) = 'ají cayena'
  and not exists (
    select 1 from public.product_catalog p2
    where p2.user_id = product_catalog.user_id and lower(p2.name) = 'ají'
  );
