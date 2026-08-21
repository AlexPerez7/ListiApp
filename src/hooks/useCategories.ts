import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { DEFAULT_CATEGORIES } from '../lib/categories'
import type { Category } from '../types'

interface DbCategory {
  id: string
  name: string
  icon: string
  position: number
}

function mapCategory(row: DbCategory): Category {
  return { id: row.id, name: row.name, icon: row.icon, position: row.position }
}

export function useCategories(session: Session | null) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const hasSeededRef = useRef(false)

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon, position')
      .order('position', { ascending: true })

    if (error) {
      console.error('Error al cargar categorías:', error.message)
      return
    }

    const rows = (data ?? []) as DbCategory[]
    setCategories(rows.map(mapCategory))

    if (rows.length === 0 && !hasSeededRef.current) {
      hasSeededRef.current = true
      const { error: seedError } = await supabase
        .from('categories')
        .insert(DEFAULT_CATEGORIES.map((category, index) => ({ ...category, position: index })))
      if (seedError) console.error('Error al crear categorías iniciales:', seedError.message)
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setCategories([])
      setLoading(false)
      hasSeededRef.current = false
      return
    }

    setLoading(true)
    fetchCategories().finally(() => setLoading(false))

    const channel = supabase
      .channel('categories-changes')
      .on<DbCategory>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories' },
        (payload) => {
          setCategories((prev) => {
            if (payload.eventType === 'DELETE') {
              return prev.filter((category) => category.id !== payload.old.id)
            }

            const mapped = mapCategory(payload.new)
            const existing = prev.find((category) => category.id === mapped.id)
            const next = existing
              ? prev.map((category) => (category.id === mapped.id ? mapped : category))
              : [...prev, mapped]
            return next.sort((a, b) => a.position - b.position)
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, fetchCategories])

  function createCategory(name: string, icon: string) {
    const id = crypto.randomUUID()
    const position = categories.length > 0 ? Math.max(...categories.map((c) => c.position)) + 1 : 0
    const newCategory: Category = { id, name, icon, position }

    setCategories((prev) => [...prev, newCategory])

    supabase
      .from('categories')
      .insert({ id, name, icon, position })
      .then(({ error }) => {
        if (error) console.error('Error al crear categoría:', error.message)
      })
  }

  function updateCategory(categoryId: string, name: string, icon: string) {
    setCategories((prev) =>
      prev.map((category) => (category.id === categoryId ? { ...category, name, icon } : category)),
    )

    supabase
      .from('categories')
      .update({ name, icon })
      .eq('id', categoryId)
      .then(({ error }) => {
        if (error) console.error('Error al editar categoría:', error.message)
      })
  }

  function reorderCategories(orderedCategoryIds: string[]) {
    const positionById = new Map(orderedCategoryIds.map((id, index) => [id, index]))

    setCategories((prev) =>
      [...prev]
        .map((category) =>
          positionById.has(category.id) ? { ...category, position: positionById.get(category.id)! } : category,
        )
        .sort((a, b) => a.position - b.position),
    )

    Promise.all(
      orderedCategoryIds.map((id, index) => supabase.from('categories').update({ position: index }).eq('id', id)),
    ).then((results) => {
      const failed = results.find((r) => r.error)
      if (failed?.error) console.error('Error al reordenar categorías:', failed.error.message)
    })
  }

  function deleteCategory(categoryId: string) {
    setCategories((prev) => prev.filter((category) => category.id !== categoryId))

    supabase
      .from('categories')
      .delete()
      .eq('id', categoryId)
      .then(({ error }) => {
        if (error) console.error('Error al eliminar categoría:', error.message)
      })
  }

  return { categories, loading, createCategory, updateCategory, deleteCategory, reorderCategories }
}
