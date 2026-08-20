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

  if (error) throw error

  const { data } = supabase.storage.from('item-images').getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}
