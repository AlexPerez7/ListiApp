import { supabase } from './supabaseClient'
import { uploadItemImage } from './imageUpload'
import { MAX_BACKUP_BYTES, type BackupPayload } from './backup'

function imageUrls(payload: BackupPayload): string[] {
  return [...new Set([
    ...payload.lists.flatMap((list) => list.items.map((item) => item.imageUrl)),
    ...(payload.catalog ?? []).map((entry) => entry.imageUrl),
    ...(payload.productPhotos ?? []).map((entry) => entry.imageUrl),
  ].filter((url): url is string => Boolean(url)))]
}

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer la foto del respaldo.'))
    reader.readAsDataURL(blob)
  })
}

export async function embedBackupImages(payload: BackupPayload): Promise<BackupPayload> {
  const images: Record<string, string> = {}
  let bytes = new TextEncoder().encode(JSON.stringify(payload)).length
  const { data } = supabase.storage.from('item-images').getPublicUrl('')
  const allowed = new URL(data.publicUrl)
  for (const url of imageUrls(payload)) {
    const parsed = new URL(url)
    if (parsed.origin !== allowed.origin || !parsed.pathname.startsWith(allowed.pathname)) {
      throw new Error('Una foto está fuera del almacenamiento de ListiApp. Reemplázala antes de exportar un respaldo completo.')
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok) throw new Error('No se pudo descargar una foto. El respaldo no se exportó; vuelve a intentarlo.')
    const blob = await response.blob()
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) || blob.size > 1024 * 1024) {
      throw new Error('Una foto tiene un formato o tamaño incompatible con el respaldo.')
    }
    const image = await blobDataUrl(blob)
    bytes += image.length + url.length + 16
    if (bytes > MAX_BACKUP_BYTES) throw new Error('El respaldo con fotos supera los 25 MB.')
    images[url] = image
  }
  return { ...payload, images }
}

/** Sube copias nuevas y actualiza todas las referencias compartidas antes de importar. */
export async function restoreBackupImages(payload: BackupPayload, userId: string): Promise<BackupPayload> {
  const replacements = new Map<string, string>()
  for (const url of imageUrls(payload)) {
    const image = payload.images?.[url]
    if (!image) continue // Compatibilidad con respaldos antiguos que solo contienen enlaces.
    const [header, encoded] = image.split(',')
    const decoded = atob(encoded)
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0))
    const mime = header.slice(5, header.indexOf(';'))
    const file = new File([bytes], 'respaldo', { type: mime })
    replacements.set(url, await uploadItemImage(userId, crypto.randomUUID(), file))
  }
  const replace = (url: string | undefined) => url ? replacements.get(url) ?? url : undefined
  return {
    ...payload,
    lists: payload.lists.map((list) => ({ ...list, items: list.items.map((item) => ({ ...item, imageUrl: replace(item.imageUrl) })) })),
    catalog: payload.catalog?.map((entry) => ({ ...entry, imageUrl: replace(entry.imageUrl) })),
    productPhotos: payload.productPhotos?.map((entry) => ({ ...entry, imageUrl: replace(entry.imageUrl)! })),
  }
}
