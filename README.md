# ListiApp

PWA de uso personal para armar listas de compras. Se instala en la pantalla de inicio del celular y funciona offline.

## Funcionalidad

- Cuenta personal con email y contraseña (Supabase Auth)
- Crear listas de compras (ej: "Súper semanal")
- Agregar ítems con nombre y cantidad opcional
- Marcar ítems como comprados
- Eliminar ítems o listas completas
- Datos guardados en Supabase (Postgres), sincronizados entre dispositivos en tiempo real

## Configuración

Copiar `.env.example` a `.env` y completar con las credenciales del proyecto de Supabase (Project Settings → API). Las tablas se crean corriendo `supabase/schema.sql` en el SQL Editor de Supabase.

## Desarrollo

```bash
npm install
npm run dev
```

## Build de producción

```bash
npm run build
npm run preview
```

## Íconos PWA

Los íconos en `public/` se generan a partir de `scripts/icon-source.svg` y `scripts/icon-maskable-source.svg`:

```bash
node scripts/generate-icons.mjs
```

## Deploy

Configurado para Netlify (`netlify.toml`): build command `npm run build`, publish dir `dist`.
