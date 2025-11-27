// ✦ Configuración de Grupo — LATAM ✦ Swill
// Exclusivo para el CREADOR (ROOWNER)

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const ctxErr = (global.rcanalx || {})
  const ctxWarn = (global.rcanalw || {})
  const ctxOk = (global.rcanalr || {})

  // ✅ Solo el CREADOR (ROOWNER) puede usar este comando
  if (!global.roowner?.includes(m.sender)) {
    return conn.reply(m.chat, '🚫 Solo el *CREADOR* puede usar este comando.', m, ctxErr)
  }

  // ✅ Diccionario de acciones
  const isClose = {
    'open': 'not_announcement',
    'close': 'announcement',
    'abierto': 'not_announcement',
    'cerrado': 'announcement',
    'abrir': 'not_announcement',
    'cerrar': 'announcement',
    'desbloquear': 'unlocked',
    'bloquear': 'locked'
  }[(args[0] || '').toLowerCase()]

  // ✅ Si no se da argumento → mostrar botones
  if (isClose === undefined) {
    const texto = `⚙️ *Configuración del grupo*\n\nSelecciona una opción para administrar el grupo:`

    const botones = [
      { buttonId: `${usedPrefix + command} abrir`, buttonText: { displayText: '🔓 Abrir grupo' }, type: 1 },
      { buttonId: `${usedPrefix + command} cerrar`, buttonText: { displayText: '🔒 Cerrar grupo' }, type: 1 },
      { buttonId: `${usedPrefix + command} bloquear`, buttonText: { displayText: '🚫 Bloquear grupo' }, type: 1 },
      { buttonId: `${usedPrefix + command} desbloquear`, buttonText: { displayText: '✅ Desbloquear grupo' }, type: 1 }
    ]

    await conn.sendMessage(
      m.chat,
      {
        text: texto,
        footer: 'Elige una opción para continuar.',
        buttons: botones,
        headerType: 4
      },
      { quoted: m }
    )

    return
  }

  // ✅ Ejecutar acción
  await conn.groupSettingUpdate(m.chat, isClose)

  let message = ''
  const arg = (args[0] || '').toLowerCase()

  if (['cerrar', 'close', 'cerrado'].includes(arg)) {
    message = '🔒 *El grupo ha sido cerrado correctamente*'
  } else if (['abrir', 'open', 'abierto'].includes(arg)) {
    message = '🔓 *El grupo ha sido abierto correctamente*'
  } else if (['bloquear', 'locked'].includes(arg)) {
    message = '🚫 *El grupo ha sido bloqueado correctamente*'
  } else if (['desbloquear', 'unlocked'].includes(arg)) {
    message = '✅ *El grupo ha sido desbloqueado correctamente*'
  } else {
    message = '✅ *Configurado correctamente*'
  }

  conn.reply(m.chat, message, m, ctxOk)
}

handler.help = ['group abrir / cerrar']
handler.tags = ['creador']        // ✅ Aparece en tu apartado personal
handler.command = ['group', 'grupo', 'cerrar', 'abrir']
handler.group = true              // ✅ Solo funciona en grupos
handler.botAdmin = true           // ✅ El bot debe ser admin

export default handler
