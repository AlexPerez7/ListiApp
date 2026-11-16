# ListiApp

PWA para armar listas de compras. Se instala en la pantalla de inicio del teléfono, sincroniza entre dispositivos y se puede usar sin conexión.

## Funcionalidad

- **Listas**: crear, renombrar, duplicar, eliminar (con "Deshacer") y compartir como texto.
- **Plantillas**: guarda una lista como plantilla y úsala para crear listas nuevas con los mismos ítems.
- **Ítems**: nombre, cantidad numérica (hasta 3 decimales), unidad (unidades, kg, g, litros, ml), precio por unidad o precio total, categoría e imagen. El subtotal se calcula automáticamente en modo por unidad. Toca la fila para marcarla como comprada, desliza a la izquierda para eliminar y arrastra para reordenar.
- **Presupuesto**: límite por lista con moneda, disponible después del carro y de toda la lista, aviso al superar el total estimado e indicación de los ítems que aún no tienen precio. No convierte importes entre monedas.
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

- `src/App.tsx`: control de sesión y carga bajo demanda de acceso, recuperación y espacio de trabajo.
- `src/Workspace.tsx`: datos y acciones de la cuenta, navegación y carga de cada pantalla cuando se abre. Los datos sincronizados permanecen montados al cambiar de pestaña.
- `src/components/`: pantallas (`Home`, `ListDetail`, `Categories`, `Products`, `Settings`, `Auth`) y piezas compartidas (`BottomSheet`, `Overlays`, `Pickers`).
- `src/hooks/useSyncedCollection.ts`: base de los datos sincronizados. Abre con la copia local, lee del servidor, escucha Realtime y vuelve a leer al reconectar.
- `src/lib/outbox.ts`: cola persistente de cambios. Cada cambio se aplica primero en pantalla y luego se envía en orden; si no hay red espera y reintenta, y si el servidor lo rechaza se avisa y se recargan los datos.
  Los errores temporales (`401`, `408`, `429` y `5xx`) conservan los cambios sin límite de intentos, con espera progresiva. El aviso permite reintentar manualmente. Los rechazos permanentes (por ejemplo, permisos `403` o datos inválidos) se notifican y se descartan; cerrar sesión con cambios pendientes también requiere confirmación.
- `src/hooks/useRoute.ts`: navegación sobre el hash de la URL, para que el botón "atrás" del teléfono funcione dentro de la app.
- `src/index.css`: sistema de diseño (colores, tipografía, botones, campos) en claro y oscuro.

## Respaldos

- Los nuevos archivos usan el formato 3: listas con presupuestos, cantidades numéricas, unidades y precios unitarios, categorías ordenadas, catálogo personal, tema, moneda, fotos recordadas y copias de las imágenes subidas. Las imágenes predeterminadas pertenecen a la app y no se duplican en el archivo.
- La exportación requiere conexión y una cola sincronizada. Lee todos los datos por páginas; si una foto no puede descargarse, avisa y no genera un respaldo incompleto.
- Se siguen aceptando respaldos de formatos 1 y 2. El formato 1 solo tenía listas y enlaces de fotos: no puede recuperar un archivo que ya no exista. Los precios sin `unitPrice` siguen siendo totales; nunca se multiplican al importar.
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

### Versión 1.4.0

- Acceso, recuperación, espacio de trabajo y pestañas se cargan bajo demanda mediante React Suspense. Las dependencias de arrastrar y ordenar ya no se ejecutan como parte del archivo principal de entrada.
- Todas las pantallas JS/CSS siguen incluidas en la caché de la PWA. El build comprueba que no falte ninguna antes de publicar. La descarga total de instalación puede ser similar: la mejora principal es reducir el código que se carga y ejecuta al abrir la app.
- El archivo principal pasó de aproximadamente 587 KB a 416 KB sin comprimir. No se requiere migración de Supabase.
- Las búsquedas de listas ignoran acentos, mayúsculas, espacios repetidos y orden de palabras. Productos, ítems y sugerencias también reconocen sinónimos conocidos y palabras interiores (por ejemplo, `mani` encuentra `Pasta de maní`).
- Las sugerencias conservan los acentos originales y evitan repetir sinónimos o recomendar un producto equivalente que ya esté pendiente.

### Versión 1.3.0

Antes de publicar el frontend, aplicar `supabase/migrations/20261116160000_quantities_and_budgets.sql` con el CLI o en SQL Editor del proyecto. Agrega campos opcionales y un trigger que mantiene `price` como subtotal para compatibilidad con clientes antiguos. Es repetible y no recalcula los precios existentes.

- Al agregar un ítem se propone cantidad 1 y precio por unidad; el precio es opcional. También puede elegirse precio total. Por ejemplo, `0,5 kg × $3.990/kg = $1.995`.
- Al editar un ítem antiguo, la cantidad de texto y el precio total se conservan. Convertirlo a cantidad numérica o precio por unidad es una elección explícita.
- Definir o editar el presupuesto desde el menú de la lista o la tarjeta Presupuesto. Dejarlo vacío lo elimina; cero es un presupuesto válido. La moneda se guarda con el presupuesto. Si difiere de la moneda de Ajustes, no se comparan importes.
- El presupuesto y los campos nuevos se sincronizan con la misma cola offline que los ítems. Duplicar listas, usar plantillas y respaldar/restaurar conservan los valores.
- Los respaldos nuevos usan formato 3 y requieren 1.3.0 o posterior para importarse. La importación de versiones 1 y 2 sigue disponible.
- Las pruebas incluyen la migración sobre PostgreSQL embebido (PGlite), sin escribir datos de prueba en Supabase.

Para volver al frontend anterior basta revertir el commit y desplegar. Mantener las columnas nuevas: eliminarlas borraría los valores guardados y no es necesario para revertir el frontend.

### Versión 1.2.0

Incluye protección de claves administrativas, reintentos persistentes de sincronización, respaldo portable de datos y fotos, lecturas completas por páginas, actualización del catálogo base desde la app y mejoras de accesibilidad. No requiere migraciones de base de datos.

Si falla el acceso a la cuenta, la lectura de listas o la sincronización tras publicar esta versión, revertir el commit de la versión y volver a desplegar mediante el workflow habitual. No borrar la cola local de los dispositivos: los cambios pendientes deben conservarse. Un respaldo de formato 2 debe restaurarse con la versión 1.2.0 o posterior para recuperar sus datos adicionales y fotos.

Se publica en GitHub Pages con el workflow `.github/workflows/deploy.yml`, que en cada push a `main` ejecuta lint, pruebas y build, y publica `dist/` en `https://alexperez7.github.io/ListiApp/`.

Configuración necesaria, una sola vez:

1. **Pages**: en el repositorio, Settings → Pages → Source: **GitHub Actions**.
2. **Secretos**: Settings → Secrets and variables → Actions → New repository secret, para `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
3. **Supabase**: Authentication → URL Configuration. Site URL: `https://alexperez7.github.io/ListiApp/`, y agrega esa misma dirección en Redirect URLs.

La ruta base la define la variable `BASE_PATH` del workflow (`/ListiApp/`). Con un dominio propio se cambia a `/`.
