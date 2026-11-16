/// <reference types="node" />
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
const db = new PGlite()
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const a = uid(1), b = uid(2)
let counter = 100
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create table lists(id uuid primary key,name text,user_id uuid references auth.users(id),created_at timestamptz default now(),is_template boolean default false);
    create table categories(id uuid primary key,user_id uuid,name text);
    create table product_catalog(id uuid primary key,user_id uuid,name text,icon_key text);
    create table items(id uuid primary key,list_id uuid references lists(id) on delete cascade,name text,quantity text,price numeric(10,2),done boolean default false,position bigint default 0,category_id uuid,icon_key text);
    insert into auth.users values('${a}'),('${b}');
    grant usage on schema public,auth to authenticated;
    grant select,insert,update,delete on lists,items,categories,product_catalog to authenticated;
    alter table lists enable row level security;
    create policy own_lists on lists to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    alter table items enable row level security;
    create policy own_items on items to authenticated using(exists(select 1 from lists where id=list_id and user_id=auth.uid()));`)
  await db.exec(readFileSync(new URL('../../../supabase/migrations/20261116160000_quantities_and_budgets.sql', import.meta.url), 'utf8'))
  const migration = readFileSync(new URL('../../../supabase/migrations/20261116170000_purchase_history.sql', import.meta.url), 'utf8')
  await db.exec(migration); await db.exec(migration)
}, 30000)
afterAll(async () => db.close())
async function asUser(user = a) { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${user}',false); set role authenticated;`) }
async function seed({ empty = false, currency = false, partial = false, template = false } = {}) {
  const list = uid(counter++), item = uid(counter++), purchase = uid(counter++)
  await db.exec(`reset role; insert into lists(id,name,user_id,is_template,currency) values('${list}','Compra','${a}',${template},${currency ? "'CLP'" : 'null'});`)
  if (!empty) await db.exec(`insert into items(id,list_id,name,quantity,quantity_value,quantity_unit,unit_price,done) values('${item}','${list}','Pan','2 unidades',2,'unit',1500,true);`)
  if (partial) await db.exec(`insert into items(id,list_id,name,done,price) values('${uid(counter++)}','${list}','Sin precio',true,null),('${uid(counter++)}','${list}','No comprado',false,2000);`)
  const rows = (await db.query<{ id: string; name: string; quantity: string | null; quantity_value: number | null; quantity_unit: string | null; unit_price: string | null; price: string | null; done: boolean }>('select * from items where list_id=$1 order by id', [list])).rows
  const expected = { name: 'Compra', ...(currency ? { currency: 'CLP' } : {}), items: rows.map((row) => ({ id: row.id, name: row.name, done: row.done,
    ...(row.quantity === null ? {} : { quantity: row.quantity }),
    ...(row.quantity_value === null ? {} : { quantityValue: Number(row.quantity_value), quantityUnit: row.quantity_unit }),
    ...(row.unit_price === null ? {} : { unitPrice: Number(row.unit_price) }), ...(row.price === null ? {} : { price: Number(row.price) }) })) }
  await asUser()
  const finish = (fingerprint: unknown = expected, code = 'CLP') => db.query('select finish_purchase($1,$2,$3,$4)', [list, purchase, code, JSON.stringify(fingerprint)])
  return { list, item, purchase, expected, finish }
}
describe('historial en PostgreSQL con permisos de usuario', () => {
  it('migra sin inferir moneda y finaliza de forma atómica e idempotente', async () => {
    const entry = await seed()
    expect((await db.query<{ currency: string | null }>('select currency from lists where id=$1', [entry.list])).rows[0].currency).toBeNull()
    await entry.finish(); await entry.finish()
    const rows = (await db.query<{ total: string; currency: string; purchased_count: number }>('select * from purchase_history where id=$1', [entry.purchase])).rows
    expect(rows).toHaveLength(1); expect(Number(rows[0].total)).toBe(3000); expect(rows[0]).toMatchObject({ currency: 'CLP', purchased_count: 1 })
    expect((await db.query('select id from lists where id=$1 and archived_at is null', [entry.list])).rows).toHaveLength(0)
    await expect(db.exec(`update items set name='Otro' where id='${entry.item}'`)).rejects.toThrow('finalizada')
    await expect(db.exec(`update lists set name='Otro' where id='${entry.list}'`)).rejects.toThrow('finalizada')
  })
  it('detecta una vista obsoleta y revierte la operación completa', async () => {
    const entry = await seed()
    await expect(entry.finish({ ...entry.expected, name: 'Obsoleto' })).rejects.toThrow('cambió')
    expect((await db.query('select id from purchase_history where id=$1', [entry.purchase])).rows).toHaveLength(0)
    expect((await db.query('select id from lists where id=$1 and archived_at is null', [entry.list])).rows).toHaveLength(1)
    await entry.finish()
  })
  it('suma solo los comprados y registra que el total está incompleto', async () => {
    const entry = await seed({ partial: true }); await entry.finish()
    const row = (await db.query<{ total: string; purchased_count: number; unpriced_count: number; items: unknown[] }>('select * from purchase_history where id=$1', [entry.purchase])).rows[0]
    expect(Number(row.total)).toBe(3000); expect(row.purchased_count).toBe(2); expect(row.unpriced_count).toBe(1); expect(row.items).toHaveLength(3)
  })
  it('aísla las compras por usuario y prohíbe modificar o borrar historial', async () => {
    const entry = await seed(); await entry.finish()
    await expect(db.exec(`update purchase_history set name='Otro' where id='${entry.purchase}'`)).rejects.toThrow('permission denied')
    await expect(db.exec(`delete from purchase_history where id='${entry.purchase}'`)).rejects.toThrow('permission denied')
    await asUser(b)
    expect((await db.query('select id from purchase_history where id=$1', [entry.purchase])).rows).toHaveLength(0)
    await expect(entry.finish()).rejects.toThrow('acceso')
    await expect(db.query("insert into purchase_history(user_id,name,currency,items) values($1,'Ajena','CLP',$2)", [a, JSON.stringify([{ name: 'Pan', done: true, price: 100 }])])).rejects.toThrow('row-level security')
  })
  it('restaura snapshots con INSERT ON CONFLICT DO NOTHING sin necesitar UPDATE', async () => {
    await asUser(); const id = uid(counter++)
    const insert = () => db.query("insert into purchase_history(id,name,currency,items) values($1,'Importada','USD',$2) on conflict(id) do nothing", [id, JSON.stringify([{ id: uid(50), name: 'Pan', price: 2.5, done: true, position: 0 }])])
    await insert(); await insert()
    const rows = (await db.query<{ total: string }>('select total from purchase_history where id=$1', [id])).rows
    expect(rows).toHaveLength(1); expect(Number(rows[0].total)).toBe(2.5)
  })
  it('rechaza listas vacías, plantillas y cambios de moneda con precios existentes', async () => {
    const empty = await seed({ empty: true }); await expect(empty.finish()).rejects.toThrow('al menos')
    const template = await seed({ template: true }); await expect(template.finish()).rejects.toThrow('plantilla')
    const priced = await seed({ currency: true })
    await expect(db.exec(`update lists set currency='USD' where id='${priced.list}'`)).rejects.toThrow('moneda')
    await expect(priced.finish(undefined, 'USD')).rejects.toThrow('moneda')
    await expect(db.exec(`update lists set archived_at=now() where id='${priced.list}'`)).rejects.toThrow('Primero')
  })
})
