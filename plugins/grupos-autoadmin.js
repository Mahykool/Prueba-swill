// Creado por Mahykol para LATAM ✦ Swill — Solo ROOWNER

let autoadminGlobal = global.autoadminGlobal ?? true
global.autoadminGlobal = autoadminGlobal

const handler = async (m, { conn, isAdmin, isBotAdmin, isROwner, usedPrefix, command, args }) => {
  const ctxErr = (global.rcanalx || {})
  const ctxWarn = (global.rcanalw || {})
  const ctxOk = (global.rcanalr || {})

  // ✅ Solo ROOWNER puede usar este comando
  if (!global.roowner?.includes(m.sender)) {
    return conn.reply(
      m.chat,
      '🚫 Solo el *ROOWNER* puede usar este comando.',
      m,
      ctxErr
    )
  }

  // ✅ ROOWNER: activar/desactivar autoadmin global
  if (['autoadmin'].includes(command) && args.length > 0) {
    if (args[0].toLowerCase() === 'on') {
      if (global.autoadminGlobal)
        return conn.reply(m.chat, '🌸✅ El comando *Autoadmin* ya estaba activado globalmente.', m, ctxWarn)

      global.autoadminGlobal = true
      return conn.reply(
        m.chat,
        '🌸✅ **Auto-Admin Activado Globalmente**\n\n' +
        '📚 *"He activado el sistema de auto-admin en todos los grupos."*\n\n' +
        '🔧 *Estado:* 🟢 ACTIVADO GLOBAL\n' +
        '👑 *Función:* Promoción automática disponible\n' +
        '🍙 *"Los administradores podrán auto-promoverse"* ✨',
        m,
        ctxOk
      )
    }

    if (args[0].toLowerCase() === 'off') {
      if (!global.autoadminGlobal)
        return conn.reply(m.chat, '🌸❌ El comando *Autoadmin* ya estaba desactivado globalmente.', m, ctxWarn)

      global.autoadminGlobal = false
      return conn.reply(
        m.chat,
        '🌸❌ **Auto-Admin Desactivado Globalmente**\n\n' +
        '📚 *"He desactivado el sistema de auto-admin en todos los grupos."*\n\n' +
        '🔧 *Estado:* 🔴 DESACTIVADO GLOBAL\n' +
        '👑 *Función:* Promoción automática deshabilitada\n' +
        '🍙 *"El sistema está temporalmente inactivo"* ✨',
        m,
        ctxWarn
      )
    }
  }

  // ✅ Si el bot no es admin, no puede promover
  if (!isBotAdmin) {
    return conn.reply(
      m.chat,
      '🤖 ❌ **Permisos del Bot**\n\n' +
      '📚 *"Necesito ser administradora para poder promover usuarios."*\n\n' +
      '🔧 *Solución:* Dame permisos de administradora',
      m,
      ctxErr
    )
  }

  // ✅ Si ya es admin, no tiene sentido promover
  if (isAdmin) {
    return conn.reply(
      m.chat,
      '👑 ❀ **Ya Eres Administrador**\n\n' +
      '📚 *"Ya tienes privilegios de administrador en este grupo."*\n\n' +
      '💡 *Puedes ayudar a moderar el grupo* ✨',
      m,
      ctxWarn
    )
  }

  try {
    await m.react('🕒')
    await conn.groupParticipantsUpdate(m.chat, [m.sender], 'promote')
    await m.react('✔️')

    await conn.reply(
      m.chat,
      `🌸✅ **Auto-Admin Ejecutado** 👑\n\n` +
      `📚 *"¡Te he otorgado privilegios de administrador exitosamente!"*\n\n` +
      `👤 *Usuario promovido:* @${m.sender.split('@')[0]}\n` +
      `👑 *Rango:* Administrador\n` +
      `🔧 *Sistema:* Auto-Admin Global\n\n` +
      `🍙 *"¡Ahora puedes ayudar a moderar el grupo!"* ✨`,
      m,
      { mentions: [m.sender], ...ctxOk }
    )

  } catch (error) {
    await m.react('✖️')
    await conn.reply(
      m.chat,
      `❌📚 **Error al Promover**\n\n` +
      `🍙 *"No pude otorgarte privilegios de administrador."*\n\n` +
      `🔧 *Detalle:* ${error.message}\n` +
      `📝 *Solución:* Usa ${usedPrefix}report para informar el problema\n\n` +
      `📖 *"¡Intentaré mejorar para la próxima!"* 🍱`,
      m,
      ctxErr
    )
  }
}

handler.help = ['autoadmin']
handler.tags = ['creador'] // ✅ Ahora aparece en tu apartado personal
handler.command = ['autoadmin']
handler.group = true

export default handler
