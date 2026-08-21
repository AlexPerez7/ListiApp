import { supabase } from './supabaseClient'

const MAX_DIMENSION = 320
const JPEG_QUALITY = 0.72

function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height))
      const width = Math.round(img.width * scale)
      const height = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen'))),
        'image/jpeg',
        JPEG_QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen'))
    }

    img.src = objectUrl
  })
}

export async function uploadItemImage(userId: string, itemId: string, file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${userId}/${itemId}.jpg`

  const { error } = await supabase.storage
    .from('item-images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })

  if (error) {
    console.error('uploadItemImage error', { path, error })
    const detail = 'statusCode' in error ? ` [${(error as { statusCode?: string }).statusCode}]` : ''
    throw new Error(`${error.message}${detail} (path: ${path})`)
  }

  const { data } = supabase.storage.from('item-images').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

// Borra la foto de un item de Storage, pero solo si el item es el dueño del
// archivo (no una copia duplicada de otro item), ningún otro item la sigue
// usando (duplicateList copia el image_url de items ya duplicados sin subir
// un archivo propio, así que varios items pueden apuntar al mismo path), y
// no quedó guardada como la foto recordada de ese producto (ver
// lib/productPhotos.ts) para autocompletar próximas compras.
export async function deleteItemImage(userId: string, itemId: string, imageUrl: string | undefined) {
  if (!imageUrl) return
  const path = `${userId}/${itemId}.jpg`
  if (!imageUrl.includes(path)) return

  const [itemsResult, photosResult] = await Promise.all([
    supabase.from('items').select('id', { count: 'exact', head: true }).neq('id', itemId).like('image_url', `%${path}%`),
    supabase.from('product_photos').select('id', { count: 'exact', head: true }).like('image_url', `%${path}%`),
  ])

  if (itemsResult.error) {
    console.error('deleteItemImage count error', { path, error: itemsResult.error })
    return
  }
  if (photosResult.error) {
    console.error('deleteItemImage product_photos count error', { path, error: photosResult.error })
    return
  }
  if ((itemsResult.count ?? 0) > 0 || (photosResult.count ?? 0) > 0) return

  const { error } = await supabase.storage.from('item-images').remove([path])
  if (error) console.error('deleteItemImage error', { path, error })
}

export function describeUploadError(err: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Sin conexión a internet. Intenta de nuevo cuando vuelvas a estar en línea.'
  }

  const message = err instanceof Error ? err.message : String(err)

  if (/exceeded the maximum allowed size|file size|too large|payload too large/i.test(message)) {
    return 'La imagen es muy pesada.'
  }
  if (/mime type|not supported|invalid.*type/i.test(message)) {
    return 'Formato de imagen no soportado. Intenta con otra foto.'
  }
  if (/row-level security|permission|unauthorized/i.test(message)) {
    return 'No tienes permiso para subir esta foto. Intenta cerrar sesión y volver a entrar.'
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.'
  }
  return 'No se pudo subir la foto. Intenta de nuevo.'
}
