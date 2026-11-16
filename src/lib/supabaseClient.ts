import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sin estas variables createClient lanza una excepción al importar el módulo
// y la app queda en blanco. Usamos valores de relleno para poder mostrar una
// pantalla de configuración clara (ver SetupNotice en App.tsx).
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(
  supabaseUrl || 'https://sin-configurar.supabase.co',
  supabaseAnonKey || 'sin-configurar',
)
