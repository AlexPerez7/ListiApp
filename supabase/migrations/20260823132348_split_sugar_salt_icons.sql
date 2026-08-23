-- "azúcar" y "sal" compartían el mismo ícono de salero. Cada uno pasa a
-- tener el suyo (iconKey sugarSalt -> sugar / salt).
update public.product_catalog
set icon_key = 'sugar'
where lower(name) = 'azúcar' and icon_key = 'sugarSalt';

update public.product_catalog
set icon_key = 'salt'
where lower(name) = 'sal' and icon_key = 'sugarSalt';
