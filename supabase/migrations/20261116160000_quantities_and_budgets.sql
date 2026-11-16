-- ListiApp 1.3.0: cantidades, precio por unidad y presupuesto.
-- Agrega campos opcionales. No convierte ni recalcula los precios existentes.
begin;

alter table public.items
  add column if not exists quantity_value numeric(12,3),
  add column if not exists quantity_unit text,
  add column if not exists unit_price numeric(12,2);

alter table public.lists
  add column if not exists budget numeric(12,2),
  add column if not exists budget_currency text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'items_numeric_quantity_check' and conrelid = 'public.items'::regclass) then
    alter table public.items add constraint items_numeric_quantity_check check (
      (quantity_value is null and quantity_unit is null) or
      (quantity_value is not null and quantity_value > 0 and quantity_value <= 1000000
       and quantity_unit is not null and quantity_unit in ('unit','kg','g','l','ml'))
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'items_unit_price_check' and conrelid = 'public.items'::regclass) then
    alter table public.items add constraint items_unit_price_check check (
      unit_price is null or (unit_price >= 0 and unit_price < 100000000 and quantity_value is not null)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lists_budget_check' and conrelid = 'public.lists'::regclass) then
    alter table public.lists add constraint lists_budget_check check (
      (budget is null and budget_currency is null) or
      (budget is not null and budget >= 0 and budget < 100000000 and budget_currency is not null
       and budget_currency in ('CLP','ARS','MXN','COP','PEN','UYU','USD','EUR'))
    );
  end if;
end;
$$;

-- price sigue representando el subtotal de la fila para clientes antiguos.
create or replace function public.sync_item_pricing()
returns trigger language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    -- Si un cliente antiguo edita cantidad/precio sin los campos nuevos,
    -- se conserva su total y se vuelve al modo de precio total.
    if NEW.unit_price is not null
       and NEW.unit_price is not distinct from OLD.unit_price
       and NEW.quantity_value is not distinct from OLD.quantity_value
       and NEW.quantity_unit is not distinct from OLD.quantity_unit
       and (NEW.price is distinct from OLD.price or NEW.quantity is distinct from OLD.quantity) then
      NEW.unit_price := null;
      NEW.quantity_value := null;
      NEW.quantity_unit := null;
    end if;
  end if;
  if NEW.unit_price is not null then
    if NEW.quantity_value is null or NEW.quantity_value <= 0 then
      raise exception 'El precio por unidad requiere una cantidad positiva.' using errcode = '23514';
    end if;
    NEW.price := pg_catalog.round(NEW.quantity_value * NEW.unit_price, 2);
  end if;
  return NEW;
end;
$$;

drop trigger if exists sync_item_pricing on public.items;
create trigger sync_item_pricing before insert or update on public.items
for each row execute function public.sync_item_pricing();

notify pgrst, 'reload schema';
commit;
