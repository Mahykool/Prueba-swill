// welcome-control.js
// Sistema de control de mensajes de bienvenida
// ✨ Creado por: Mahykol
// (Aquí puedes añadir comentarios futuros o marcas personalizadas)

let handler = async (m, { conn, usedPrefix, command, isAdmin }) => {
  const ctxErr = (global.rcanalx || {})
  const ctxWarn = (global.rcanalw || {})
  const ctxOk = (global.rcanalr || {})

  if (!m.isGroup) return conn.reply(m.chat, '❌ Este comando solo funciona en grupos', m, ctxErr)
  if (!isAdmin) return conn.reply(m.chat, '❌ Solo los administradores pueden usar este comando', m, ctxErr)

  const action = (m.text || '').toLowerCase().split(' ')[1]
  const jid = m.chat

  try {
    // Importar funciones desde lib/welcome.js
    const { setWelcomeState, isWelcomeEnabled } = await import('../lib/welcome.js')
    
    if (action === 'on' || action === 'activar') {
      setWelcomeState(jid, true)
      return conn.reply(m.chat, 
        `✅ *Welcome activado*\n\nAhora se enviarán mensajes de bienvenida y despedida en este grupo`, 
      m, ctxOk)
    } 
    else if (action === 'off' || action === 'desactivar') {
      setWelcomeState(jid, false)
      return conn.reply(m.chat, 
        `❌ *Welcome desactivado*\n\nYa no se enviarán mensajes de bienvenida y despedida en este grupo`, 
      m, ctxErr)
    }
    else if (action === 'status' || action === 'estado') {
      const status = isWelcomeEnabled(jid) ? '🟢 ACTIVADO' : '🔴 DESACTIVADO'
      return conn.reply(m.chat, 
        `📊 *Estado del Welcome*\n\nEstado actual: ${status}\n\nUsa:\n` +
        `*${usedPrefix}welcome on* - Para activar\n` +
        `*${usedPrefix}welcome off* - Para desactivar`, 
      m, ctxWarn)
    }
    else {
      return conn.reply(m.chat, 
        `🏷 *Configuración del Welcome*\n\nUsa:\n` +
        `*${usedPrefix}welcome on* - Activar welcome\n` +
        `*${usedPrefix}welcome off* - Desactivar welcome\n` +
        `*${usedPrefix}welcome status* - Ver estado actual`, 
      m, ctxWarn)
    }
  } catch (importError) {
    console.error('Error importing from lib/welcome.js:', importError)
    return conn.reply(m.chat, 
      `❌ Error: No se pudo cargar el sistema de welcome`, 
    m, ctxErr)
  }
}

handler.help = ['welcome']
handler.tags = ['group']
handler.command = ['welcome']
handler.admin = true
handler.group = true

export default handler
