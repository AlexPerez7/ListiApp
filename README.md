# ListiApp

PWA de uso personal para armar listas de compras. Se instala en la pantalla de inicio del celular y funciona offline.

## Funcionalidad

- Crear listas de compras (ej: "Súper semanal")
- Agregar ítems con nombre y cantidad opcional
- Marcar ítems como comprados
- Eliminar ítems o listas completas
- Todo se guarda en `localStorage`, no hay backend

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
