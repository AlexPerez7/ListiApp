import { supabase } from './supabaseClient'
import { normalizeProductName } from './productCatalog'

// Recuerda la foto que el usuario subió para un producto, por nombre
// normalizado, para autocompletarla la próxima vez que agregue el mismo
// producto (en esta lista o en otra).
export async function rememberProductPhoto(name: string, imageUrl: string) {
  const nameKey = normalizeProductName(name)
  if (!nameKey) return

  const { error } = await supabase
    .from('product_photos')
    .upsert({ name_key: nameKey, image_url: imageUrl }, { onConflict: 'user_id,name_key' })

  if (error) console.error('Error al recordar la foto del producto:', error.message)
}

export async function lookupProductPhoto(name: string): Promise<string | undefined> {
  const nameKey = normalizeProductName(name)
  if (!nameKey) return undefined

  const { data, error } = await supabase
    .from('product_photos')
    .select('image_url')
    .eq('name_key', nameKey)
    .maybeSingle()

  if (error) {
    console.error('Error al buscar la foto del producto:', error.message)
    return undefined
  }
  return data?.image_url ?? undefined
}
