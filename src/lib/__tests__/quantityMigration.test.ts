/// <reference types="node" />
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const db = new PGlite()
const migration = readFileSync(new URL('../../../supabase/migrations/20261116160000_quantities_and_budgets.sql', import.meta.url), 'utf8')
beforeAll(async () => {
  await db.exec("create table lists(id text primary key); create table items(id text primary key, quantity text, price numeric(10,2)); insert into items values('legacy','2 kg',3000);")
  await db.exec(migration)
  await db.exec(migration)
}, 30000)
afterAll(async () => db.close())
describe('migración de cantidades en PostgreSQL', () => {
  it('es repetible y no convierte los precios anteriores', async () => {
    const { rows } = await db.query<{ price: string; quantity_value: string | null; unit_price: string | null }>("select * from items where id='legacy'")
    expect(Number(rows[0].price)).toBe(3000)
    expect(rows[0].quantity_value).toBeNull()
    expect(rows[0].unit_price).toBeNull()
  })
  it('calcula fracciones y mantiene price como subtotal para clientes antiguos', async () => {
    await db.exec("insert into items(id,quantity_value,quantity_unit,unit_price) values('fraction',0.5,'kg',3990)")
    const { rows } = await db.query<{ price: string }>("select price from items where id='fraction'")
    expect(Number(rows[0].price)).toBe(1995)
  })
  it('distingue una actualización numérica de una edición hecha por un cliente antiguo', async () => {
    await db.exec("insert into items(id,quantity,quantity_value,quantity_unit,unit_price) values('updated','2 unidades',2,'unit',1500)")
    await db.exec("update items set quantity='3 unidades',quantity_value=3,price=4500 where id='updated'")
    let rows = (await db.query<{ price: string; unit_price: string | null }>("select price,unit_price from items where id='updated'")).rows
    expect(Number(rows[0].price)).toBe(4500)
    expect(Number(rows[0].unit_price)).toBe(1500)
    await db.exec("update items set price=4000 where id='updated'")
    rows = (await db.query<{ price: string; unit_price: string | null }>("select price,unit_price from items where id='updated'")).rows
    expect(Number(rows[0].price)).toBe(4000)
    expect(rows[0].unit_price).toBeNull()
  })
  it('rechaza cantidades y presupuestos inválidos y acepta presupuesto cero', async () => {
    await expect(db.exec("insert into items(id,quantity_value,quantity_unit) values('bad',0,'unit')")).rejects.toThrow()
    await expect(db.exec("insert into lists(id,budget,budget_currency) values('bad',-1,'CLP')")).rejects.toThrow()
    await db.exec("insert into lists(id,budget,budget_currency) values('valid',0,'CLP')")
  })
})
