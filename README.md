# ListiApp

PWA para armar listas de compras. Se instala en la pantalla de inicio del teléfono, sincroniza entre dispositivos y se puede usar sin conexión.

## Funcionalidad

- **Listas**: crear, renombrar, duplicar, eliminar (con "Deshacer") y compartir como texto.
- **Plantillas**: guarda una lista como plantilla y úsala para crear listas nuevas con los mismos ítems.
- **Ítems**: nombre, cantidad, precio, categoría e imagen. Toca la fila para marcarla como comprada, desliza a la izquierda para eliminar y arrastra para reordenar.
- **Carga rápida**: el panel de agregar queda abierto para cargar varios ítems seguidos, sugiere tus compras frecuentes y los productos del catálogo, recuerda la categoría de cada producto y evita duplicados.
- **Avance y totales**: barra de progreso por lista y totales "en el carro / por comprar" según los precios cargados.
- **Categorías**: agrupan los ítems por pasillo; se ordenan arrastrando.
- **Productos**: catálogo que asigna una imagen a cada ítem según su nombre (con ícono o foto propia).
- **Sin conexión**: los datos se guardan en el dispositivo y los cambios hechos sin conexión se envían solos al reconectar.
- **Cuenta**: correo y contraseña o Google (Supabase Auth), con recuperación de contraseña.
- **Ajustes**: tema claro/oscuro/automático, moneda, y exportar/importar un respaldo en JSON.

## Configuración

1. Copia `.env.example` a `.env` y completa las credenciales del proyecto de Supabase (Project Settings → API).
2. Crea el esquema de base de datos con las migraciones de `supabase/migrations/`:

   ```bash
   supabase link --project-ref <ref-del-proyecto>
   ```

   ```bash
   supabase db push
   ```

   `supabase/schema.sql` se conserva solo como historial del esquema inicial; los cambios nuevos van siempre como migraciones (`supabase migration new <nombre>`).

## Desarrollo

```bash
npm install
```

```bash
npm run dev
```

Otros comandos:

| Comando           | Qué hace                                      |
| ----------------- | --------------------------------------------- |
| `npm run build`   | Verifica tipos y genera el build de producción |
| `npm run preview` | Sirve el build de producción                  |
| `npm run lint`    | Analiza el código con oxlint                  |
| `npm test`        | Ejecuta las pruebas unitarias (Vitest)        |

## Arquitectura

- `src/App.tsx`: control de sesión y composición de pantallas.
- `src/components/`: pantallas (`Home`, `ListDetail`, `Categories`, `Products`, `Settings`, `Auth`) y piezas compartidas (`BottomSheet`, `Overlays`, `Pickers`).
- `src/hooks/useSyncedCollection.ts`: base de los datos sincronizados. Abre con la copia local, lee del servidor, escucha Realtime y vuelve a leer al reconectar.
- `src/lib/outbox.ts`: cola persistente de cambios. Cada cambio se aplica primero en pantalla y luego se envía en orden; si no hay red espera y reintenta, y si el servidor lo rechaza se avisa y se recargan los datos.
- `src/hooks/useRoute.ts`: navegación sobre el hash de la URL, para que el botón "atrás" del teléfono funcione dentro de la app.
- `src/index.css`: sistema de diseño (colores, tipografía, botones, campos) en claro y oscuro.

## Íconos PWA

Los íconos en `public/` se generan a partir de `scripts/icon-source.svg` y `scripts/icon-maskable-source.svg`:

```bash
node scripts/generate-icons.mjs
```

## Deploy

Configurado para Netlify (`netlify.toml`): build command `npm run build`, publish dir `dist`. Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se definen en el panel de Netlify.
