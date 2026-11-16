export interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

/** Páginas ordenadas por una clave única; evita truncar resultados en PostgREST. */
export async function readAllPages<T>(
  read: (from: number, to: number) => PromiseLike<PageResult<T>>,
  size = 500,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += size) {
    const { data, error } = await read(from, from + size - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < size) return rows
  }
}
