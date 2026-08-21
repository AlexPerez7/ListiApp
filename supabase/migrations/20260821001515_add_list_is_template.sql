-- Marca una lista como "plantilla": no es una lista de compra en curso,
-- sino un modelo reutilizable (ej: "Compra semanal") del que se generan
-- listas nuevas con "Usar plantilla" sin tener que duplicarla a mano cada vez.
alter table public.lists add column is_template boolean not null default false;
