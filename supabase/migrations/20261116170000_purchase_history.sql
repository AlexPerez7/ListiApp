-- ListiApp 1.6: historial inmutable y moneda propia por lista.
-- Las listas anteriores quedan SIN moneda asignada: no se reinterpretan precios.
begin;

alter table public.lists add column if not exists currency text;
alter table public.lists add column if not exists archived_at timestamptz;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='lists_currency_check' and conrelid='public.lists'::regclass) then
    alter table public.lists add constraint lists_currency_check check
      (currency is null or currency in ('CLP','ARS','MXN','COP','PEN','UYU','USD','EUR'));
  end if;
end $$;

create table if not exists public.purchase_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_list_id uuid,
  name text not null check (length(trim(name)) between 1 and 200),
  completed_at timestamptz not null default now(),
  currency text not null check (currency in ('CLP','ARS','MXN','COP','PEN','UYU','USD','EUR')),
  total numeric(14,2) not null default 0,
  purchased_count integer not null default 0,
  unpriced_count integer not null default 0,
  budget numeric(12,2),
  budget_currency text,
  items jsonb not null check (jsonb_typeof(items)='array'),
  check (budget is null or (budget >= 0 and budget < 100000000)),
  check (budget_currency is null or budget_currency in ('CLP','ARS','MXN','COP','PEN','UYU','USD','EUR'))
);
create unique index if not exists purchase_history_source_idx on public.purchase_history(source_list_id) where source_list_id is not null;
create index if not exists purchase_history_user_date_idx on public.purchase_history(user_id,completed_at desc);
create index if not exists lists_active_user_idx on public.lists(user_id,created_at desc) where archived_at is null;
alter table public.purchase_history enable row level security;
alter table public.purchase_history replica identity full;
drop policy if exists purchase_history_read on public.purchase_history;
create policy purchase_history_read on public.purchase_history for select to authenticated using (user_id=auth.uid());
drop policy if exists purchase_history_insert on public.purchase_history;
create policy purchase_history_insert on public.purchase_history for insert to authenticated with check (
  user_id=auth.uid() and (source_list_id is null or exists (
    select 1 from public.lists where id=source_list_id and user_id=auth.uid()
  ))
);
revoke all on public.purchase_history from anon;
revoke update, delete on public.purchase_history from authenticated;
grant select, insert on public.purchase_history to authenticated;

-- Calcula los totales desde los productos de la copia, también al importar respaldos.
create or replace function public.validate_purchase_history()
returns trigger language plpgsql set search_path='' as $$
declare product jsonb; amount numeric; unit_cost numeric; line_total numeric;
begin
  if TG_OP='UPDATE' then raise exception 'Una compra finalizada no se puede modificar.' using errcode='42501'; end if;
  if jsonb_typeof(NEW.items) is distinct from 'array' or jsonb_array_length(NEW.items)>10000 then
    raise exception 'Productos del historial inválidos.' using errcode='23514';
  end if;
  NEW.total:=0; NEW.purchased_count:=0; NEW.unpriced_count:=0;
  for product in select value from jsonb_array_elements(NEW.items) loop
    if jsonb_typeof(product) is distinct from 'object' or jsonb_typeof(product->'name') is distinct from 'string'
       or length(trim(product->>'name')) not between 1 and 200 or jsonb_typeof(product->'done') is distinct from 'boolean' then
      raise exception 'Producto del historial inválido.' using errcode='23514';
    end if;
    amount:=null; unit_cost:=null; line_total:=null;
    if product ? 'quantityValue' then
      if jsonb_typeof(product->'quantityValue') is distinct from 'number' or
         coalesce(product->>'quantityUnit','') not in ('unit','kg','g','l','ml') then
        raise exception 'Cantidad o unidad inválida.' using errcode='23514';
      end if;
      amount:=(product->>'quantityValue')::numeric;
      if amount<=0 or amount>1000000 or round(amount,3)<>amount then raise exception 'Cantidad inválida.' using errcode='23514'; end if;
    end if;
    if product ? 'price' then
      if jsonb_typeof(product->'price') is distinct from 'number' then raise exception 'Precio inválido.' using errcode='23514'; end if;
      line_total:=(product->>'price')::numeric;
      if line_total<0 or line_total>=100000000 or round(line_total,2)<>line_total then raise exception 'Precio inválido.' using errcode='23514'; end if;
    end if;
    if product ? 'unitPrice' then
      if amount is null or jsonb_typeof(product->'unitPrice') is distinct from 'number' then raise exception 'Precio unitario inválido.' using errcode='23514'; end if;
      unit_cost:=(product->>'unitPrice')::numeric;
      if unit_cost<0 or unit_cost>=100000000 or round(unit_cost,2)<>unit_cost
         or line_total is distinct from round(amount*unit_cost,2) then
        raise exception 'El subtotal no corresponde a cantidad y precio.' using errcode='23514';
      end if;
    end if;
    if (product->>'done')::boolean then
      NEW.purchased_count:=NEW.purchased_count+1;
      NEW.total:=NEW.total+coalesce(line_total,0);
      if line_total is null then NEW.unpriced_count:=NEW.unpriced_count+1; end if;
    end if;
  end loop;
  if NEW.purchased_count=0 then raise exception 'Marca al menos un producto comprado.' using errcode='23514'; end if;
  return NEW;
end $$;
drop trigger if exists validate_purchase_history on public.purchase_history;
create trigger validate_purchase_history before insert or update on public.purchase_history for each row execute function public.validate_purchase_history();

-- Serializa las ediciones de productos con el cierre de su lista.
create or replace function public.guard_purchase_items()
returns trigger language plpgsql set search_path='' as $$
declare archived timestamptz; target uuid;
begin
  target:=case when TG_OP='DELETE' then OLD.list_id else NEW.list_id end;
  select archived_at into archived from public.lists where id=target for update;
  if archived is not null then raise exception 'La compra ya está finalizada.' using errcode='42501'; end if;
  if TG_OP='DELETE' then return OLD; end if;
  return NEW;
end $$;
drop trigger if exists guard_purchase_items on public.items;
create trigger guard_purchase_items before insert or update or delete on public.items for each row execute function public.guard_purchase_items();

create or replace function public.guard_purchase_list()
returns trigger language plpgsql set search_path='' as $$
begin
  if OLD.archived_at is not null and NEW is distinct from OLD then raise exception 'La compra ya está finalizada.' using errcode='42501'; end if;
  if OLD.currency is not null and NEW.currency is distinct from OLD.currency and
     (OLD.budget is not null or exists(select 1 from public.items where list_id=OLD.id and price is not null)) then
    raise exception 'La moneda de una lista con importes guardados no se puede cambiar.' using errcode='23514';
  end if;
  if OLD.archived_at is null and NEW.archived_at is not null and not exists(
    select 1 from public.purchase_history where source_list_id=OLD.id and user_id=OLD.user_id
  ) then raise exception 'Primero debe guardarse la compra en el historial.' using errcode='23514'; end if;
  return NEW;
end $$;
drop trigger if exists guard_purchase_list on public.lists;
create trigger guard_purchase_list before update on public.lists for each row execute function public.guard_purchase_list();

-- Idempotente: repetir el mismo ID tras una desconexión no duplica la compra.
-- Verifica la vista confirmada por el usuario para no cerrar datos obsoletos.
create or replace function public.finish_purchase(p_list_id uuid,p_purchase_id uuid,p_currency text,p_expected jsonb)
returns uuid language plpgsql set search_path='' as $$
declare source public.lists%rowtype; previous public.purchase_history%rowtype; expected jsonb; products jsonb;
begin
  if auth.uid() is null then raise exception 'Inicia sesión.' using errcode='42501'; end if;
  select * into previous from public.purchase_history where id=p_purchase_id and user_id=auth.uid();
  if found then
    if previous.source_list_id is distinct from p_list_id then raise exception 'ID de compra en conflicto.' using errcode='40001'; end if;
    return previous.id;
  end if;
  select * into source from public.lists where id=p_list_id and user_id=auth.uid() for update;
  if not found then raise exception 'No tienes acceso a esta lista.' using errcode='42501'; end if;
  if source.archived_at is not null then raise exception 'Otra sesión ya finalizó esta compra.' using errcode='40001'; end if;
  if source.is_template then raise exception 'Crea una lista desde la plantilla antes de finalizar.' using errcode='23514'; end if;
  if p_currency is null or p_currency not in ('CLP','ARS','MXN','COP','PEN','UYU','USD','EUR') or
     (source.currency is not null and source.currency<>p_currency) then raise exception 'Confirma la moneda de la lista.' using errcode='23514'; end if;
  select jsonb_strip_nulls(jsonb_build_object('name',source.name,'currency',source.currency,
    'budget',source.budget,'budgetCurrency',source.budget_currency,'items',coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object('id',id,'name',name,'quantity',quantity,'quantityValue',quantity_value,
        'quantityUnit',quantity_unit,'unitPrice',unit_price,'price',price,'done',done)) order by id
    ),'[]'::jsonb))) into expected from public.items where list_id=source.id;
  if expected is distinct from p_expected then raise exception 'La lista cambió. Revísala y vuelve a finalizar.' using errcode='40001'; end if;
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',i.id,'name',i.name,'quantity',i.quantity,'quantityValue',i.quantity_value,'quantityUnit',i.quantity_unit,
    'unitPrice',i.unit_price,'price',i.price,'done',i.done,'position',i.position,
    'categoryName',c.name,'iconKey',coalesce(i.icon_key,pc.icon_key))) order by i.position,i.id),'[]'::jsonb)
    into products from public.items i left join public.categories c on c.id=i.category_id
    left join public.product_catalog pc on pc.user_id=source.user_id and lower(pc.name)=lower(i.name) where i.list_id=source.id;
  insert into public.purchase_history(id,user_id,source_list_id,name,currency,budget,budget_currency,items)
    values(p_purchase_id,auth.uid(),source.id,source.name,p_currency,source.budget,source.budget_currency,products);
  update public.lists set currency=p_currency,archived_at=now() where id=source.id;
  return p_purchase_id;
end $$;
revoke all on function public.finish_purchase(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.finish_purchase(uuid,uuid,text,jsonb) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
    select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='purchase_history'
  ) then alter publication supabase_realtime add table public.purchase_history; end if;
end $$;
notify pgrst,'reload schema';
commit;
