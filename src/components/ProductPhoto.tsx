import { useState, type ImgHTMLAttributes, type ReactNode } from 'react'

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  fallback: ReactNode
}

/** Una URL rota no impide mostrar el icono o la inicial de respaldo. */
export function ProductPhoto({ src, fallback, ...props }: Props) {
  const [failed, setFailed] = useState<string | null>(null)
  return failed === src ? fallback : <img {...props} src={src} onError={() => setFailed(src)} />
}
