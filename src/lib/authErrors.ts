// Supabase Auth responde los errores en inglés: los traducimos a mensajes
// claros para quien usa la app.
const BY_CODE: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Aún no confirmas tu correo. Revisa tu bandeja de entrada y abre el enlace que te enviamos.',
  user_already_exists: 'Ya existe una cuenta con este correo. Inicia sesión.',
  email_exists: 'Ya existe una cuenta con este correo. Inicia sesión.',
  weak_password: 'La contraseña es muy débil. Usa al menos 6 caracteres.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
  over_email_send_rate_limit: 'Enviamos demasiados correos seguidos. Espera unos minutos e intenta de nuevo.',
  over_request_rate_limit: 'Demasiados intentos. Espera un momento e intenta de nuevo.',
  signup_disabled: 'El registro de cuentas nuevas está deshabilitado.',
  email_address_invalid: 'El correo no es válido.',
  validation_failed: 'Revisa los datos ingresados.',
  session_expired: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  otp_expired: 'El enlace expiró. Solicita uno nuevo.',
}

const BY_MESSAGE: [RegExp, string][] = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered/i, BY_CODE.user_already_exists],
  [/password should be at least/i, BY_CODE.weak_password],
  [/rate limit|too many/i, BY_CODE.over_request_rate_limit],
  [/failed to fetch|network|load failed/i, 'No se pudo conectar. Revisa tu conexión a internet e intenta de nuevo.'],
]

export function describeAuthError(error: { message: string; code?: string }): string {
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
  for (const [pattern, text] of BY_MESSAGE) {
    if (pattern.test(error.message)) return text
  }
  return 'Ocurrió un problema. Intenta de nuevo en un momento.'
}
