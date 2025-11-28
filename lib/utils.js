// lib/utils.js
export function decodeJidCompat(jid = '') {
  // Normaliza y devuelve un JID compatible: user@server o digits@s.whatsapp.net
  if (!jid) return null
  if (typeof jid !== 'string') return jid

  jid = jid.trim()

  // Intentar usar jidDecode si está disponible en el entorno (globalThis o scope)
  try {
    const maybeJidDecode = (typeof jidDecode === 'function' && jidDecode) ||
                           (typeof globalThis?.jidDecode === 'function' && globalThis.jidDecode) ||
                           null
    if (maybeJidDecode) {
      const dec = maybeJidDecode(jid)
      if (dec && dec.user && dec.server) return `${dec.user}@${dec.server}`
    }
  } catch (e) {
    // no bloquear, seguimos con fallback
  }

  // Fallback robusto:
  // - user:device@server  -> user@server
  // - user@server         -> user@server (validado)
  // - +521234567890       -> 521234567890@s.whatsapp.net
  try {
    // Si contiene '@', reconstruir quitando posible sufijo de dispositivo
    if (jid.includes('@')) {
      const [left, ...rest] = jid.split('@')
      const server = rest.join('@')
      const user = left.includes(':') ? left.split(':')[0] : left
      if (user && server) return `${user}@${server}`.trim()
    }

    // Si no tiene servidor, extraer dígitos y devolver con dominio por defecto
    const digits = String(jid).replace(/\D+/g, '')
    if (digits) return `${digits}@s.whatsapp.net`

    // Fallback final: devolver la cadena original limpia
    return String(jid).trim()
  } catch (e) {
    // Último recurso: quitar parte de dispositivo si existe
    try { return String(jid).split(':')[0] } catch { return String(jid) }
  }
}