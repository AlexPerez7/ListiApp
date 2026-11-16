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
- **Actualizaciones**: cuando hay una versión nueva aparece un aviso arriba y un botón en Ajustes; se aplica recién al tocar "Actualizar". También se puede buscar una versión nueva a pedido.

## Configuración

1. Copia `.env.example` a `.env` y completa las credenciales del proyecto de Supabase (Project Settings → API).
   Usa una clave **publishable** (`sb_publishable_…`) o la antigua **anon**. Nunca una clave `secret` o `service_role`: Vite incluye las variables `VITE_*` usadas en el frontend. La configuración rechaza claves administrativas al desarrollar o compilar.
   Las tareas administrativas locales deben usar un archivo separado, ignorado por Git, como `.env.admin.local`, con `SUPABASE_URL` y `SUPABASE_SECRET_KEY` (sin el prefijo `VITE_`). Ese archivo no lo carga la app. El comando de build también comprueba que los archivos públicos no contengan claves administrativas de Supabase.
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
  Los errores temporales (`401`, `408`, `429` y `5xx`) conservan los cambios sin límite de intentos, con espera progresiva. El aviso permite reintentar manualmente. Los rechazos permanentes (por ejemplo, permisos `403` o datos inválidos) se notifican y se descartan; cerrar sesión con cambios pendientes también requiere confirmación.
- `src/hooks/useRoute.ts`: navegación sobre el hash de la URL, para que el botón "atrás" del teléfono funcione dentro de la app.
- `src/index.css`: sistema de diseño (colores, tipografía, botones, campos) en claro y oscuro.

## Respaldos

- Los nuevos archivos usan el formato 2: listas, categorías ordenadas, catálogo personal, tema, moneda, fotos recordadas y copias de las imágenes subidas. Las imágenes predeterminadas pertenecen a la app y no se duplican en el archivo.
- La exportación requiere conexión y una cola sincronizada. Lee todos los datos por páginas; si una foto no puede descargarse, avisa y no genera un respaldo incompleto.
- Se siguen aceptando respaldos del formato 1. Esos archivos solo tenían listas y enlaces de fotos: no pueden recuperar un archivo que ya no exista.
- La importación agrega listas y categorías/productos que falten, conserva los existentes con el mismo nombre y aplica tema/moneda del archivo. Sube copias nuevas de las fotos a la cuenta actual. Repetir una importación duplica las listas.
- Límite del archivo: 25 MB; cada foto embebida admite hasta aproximadamente 1 MB. Importar fotos requiere conexión.
- Los respaldos contienen datos personales y fotos: guárdalos como cualquier otro archivo privado.

## Catálogo y mantenimiento

- `DEFAULT_PRODUCT_CATALOG` define el catálogo base. Las cuentas existentes pueden incorporar productos faltantes desde Productos, sin sobrescribir elecciones personales ni modificar la base manualmente.
- Las coincidencias exactas tienen prioridad sobre los sinónimos conocidos (por ejemplo, banana/plátano y mantequilla/pasta de maní).
- La dependencia `glob` de Workbox usa una versión corregida mediante `overrides`. Al actualizar Workbox, revisar si el override sigue siendo necesario y comprobar que el build PWA incluya todos los recursos.
- Auditoría de esta actualización: sin alertas altas o moderadas. Persisten alertas bajas asociadas a `deepmerge` en la cadena de compilación de Workbox; no hay una versión parcheada compatible publicada. Revisar con `npm audit` antes de cada actualización; evitar `npm audit fix --force` sin evaluar sus cambios.

## Íconos PWA

Los íconos en `public/` se generan a partir de `scripts/icon-source.svg` y `scripts/icon-maskable-source.svg`:

```bash
node scripts/generate-icons.mjs
```

## Deploy

### Versión 1.2.0

Incluye protección de claves administrativas, reintentos persistentes de sincronización, respaldo portable de datos y fotos, lecturas completas por páginas, actualización del catálogo base desde la app y mejoras de accesibilidad. No requiere migraciones de base de datos.

Si falla el acceso a la cuenta, la lectura de listas o la sincronización tras publicar esta versión, revertir el commit de la versión y volver a desplegar mediante el workflow habitual. No borrar la cola local de los dispositivos: los cambios pendientes deben conservarse. Un respaldo de formato 2 debe restaurarse con la versión 1.2.0 o posterior para recuperar sus datos adicionales y fotos.

Se publica en GitHub Pages con el workflow `.github/workflows/deploy.yml`, que en cada push a `main` ejecuta lint, pruebas y build, y publica `dist/` en `https://alexperez7.github.io/ListiApp/`.

Configuración necesaria, una sola vez:

1. **Pages**: en el repositorio, Settings → Pages → Source: **GitHub Actions**.
2. **Secretos**: Settings → Secrets and variables → Actions → New repository secret, para `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. **Supabase**: Authentication → URL Configuration. Site URL: `https://alexperez7.github.io/ListiApp/`, y agrega esa misma dirección en Redirect URLs.

La ruta base la define la variable `BASE_PATH` del workflow (`/ListiApp/`). Con un dominio propio se cambia a `/`.
