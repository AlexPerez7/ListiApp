// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildBackup, parseBackup } from '../backup'

vi.mock('../supabaseClient', () => ({ supabase: { storage: { from: () => ({
  getPublicUrl: () => ({ data: { publicUrl: 'https://project.supabase.co/storage/v1/object/public/item-images/' } }),
}) } } }))
vi.mock('../imageUpload', () => ({ uploadItemImage: vi.fn(async () => 'https://project.supabase.co/restored.jpg') }))

const { embedBackupImages, restoreBackupImages } = await import('../backupImages')
const { uploadItemImage } = await import('../imageUpload')
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('fotos del respaldo', () => {
  const url = 'https://project.supabase.co/storage/v1/object/public/item-images/user/photo.jpg'
  const make = () => buildBackup([], [], {
    catalog: [{ id: 'p', name: 'Pan', iconKey: 'bread', imageUrl: url }],
    productPhotos: [{ nameKey: 'pan', imageUrl: url }],
  })

  it('descarga una sola copia compartida y restaura todos sus enlaces en la cuenta destino', async () => {
    const request = vi.fn(async () => ({ ok: true, blob: async () => new Blob(['photo'], { type: 'image/jpeg' }) }))
    vi.stubGlobal('fetch', request)
    const portable = await embedBackupImages(make())
    expect(request).toHaveBeenCalledTimes(1)
    expect(portable.images?.[url]).toMatch(/^data:image\/jpeg;base64,/)
    const restored = await restoreBackupImages(parseBackup(JSON.stringify(portable)), 'destination-user')
    expect(uploadItemImage).toHaveBeenCalledTimes(1)
    expect(vi.mocked(uploadItemImage).mock.calls[0][0]).toBe('destination-user')
    expect(restored.catalog?.[0].imageUrl).toBe('https://project.supabase.co/restored.jpg')
    expect(restored.productPhotos?.[0].imageUrl).toBe(restored.catalog?.[0].imageUrl)
  })

  it('no exporta silenciosamente un respaldo incompleto cuando una foto falla', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    await expect(embedBackupImages(make())).rejects.toThrow('No se pudo descargar')
  })

  it('no descarga URLs externas introducidas en archivos importados', async () => {
    const request = vi.fn()
    vi.stubGlobal('fetch', request)
    const payload = make()
    payload.catalog![0].imageUrl = 'https://external.example/photo.jpg'
    await expect(embedBackupImages(payload)).rejects.toThrow('fuera del almacenamiento')
    expect(request).not.toHaveBeenCalled()
  })
})
