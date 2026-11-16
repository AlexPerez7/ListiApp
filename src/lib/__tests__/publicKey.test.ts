import { describe, expect, it } from 'vitest'
import { isPublicSupabaseKey } from '../publicKey'

describe('claves del frontend', () => {
  it('rechaza claves administrativas, JWT service_role y valores inválidos', () => {
    const jwt = `e30.${btoa(JSON.stringify({ role: 'service_role' }))}.signature`
    for (const key of [undefined, '', 'sb_secret_test', jwt, 'invalid']) {
      expect(isPublicSupabaseKey(key)).toBe(false)
    }
  })
  it('acepta publishable y JWT anon', () => {
    expect(isPublicSupabaseKey('sb_publishable_test')).toBe(true)
    expect(isPublicSupabaseKey(`e30.${btoa(JSON.stringify({ role: 'anon' }))}.signature`)).toBe(true)
  })
})
