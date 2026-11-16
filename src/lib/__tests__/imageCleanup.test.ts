import { beforeEach, describe, expect, it, vi } from 'vitest'

const server = vi.hoisted(() => ({ references: {} as Record<string, number>, error: false, remove: vi.fn() }))
vi.mock('../supabaseClient', () => ({ supabase: {
  from: (table: string) => ({ select: () => ({ like: async () => ({
    count: server.references[table] ?? 0, error: server.error ? { message: 'sin conexión' } : null,
  }) }) }),
  storage: { from: () => ({ remove: server.remove }) },
} }))
const { deleteItemImage, deleteCatalogImage } = await import('../imageUpload')
beforeEach(() => { server.references = {}; server.error = false; server.remove.mockReset().mockResolvedValue({ error: null }) })

describe('limpieza de fotos', () => {
  it('conserva la foto si el propio ítem sigue usándola después de un fallo', async () => {
    server.references.items = 1
    await deleteItemImage('user', 'item', 'https://example.com/user/item.jpg')
    expect(server.remove).not.toHaveBeenCalled()
  })
  it.each(['product_catalog', 'items', 'product_photos'])('conserva la foto de catálogo si %s aún la referencia', async (table) => {
    server.references[table] = 1
    await deleteCatalogImage('user', 'product', 'https://example.com/user/catalog/product.jpg')
    expect(server.remove).not.toHaveBeenCalled()
  })
  it('elimina un archivo propio solo después de comprobar que no tiene referencias', async () => {
    await deleteCatalogImage('user', 'product', 'https://example.com/user/catalog/product.jpg')
    expect(server.remove).toHaveBeenCalledWith(['user/catalog/product.jpg'])
  })
  it('no borra archivos si no pudo comprobar las referencias o si pertenecen a otro ítem', async () => {
    server.error = true
    await deleteCatalogImage('user', 'product', 'https://example.com/user/catalog/product.jpg')
    await deleteItemImage('user', 'item', 'https://example.com/other/item.jpg')
    expect(server.remove).not.toHaveBeenCalled()
  })
})
