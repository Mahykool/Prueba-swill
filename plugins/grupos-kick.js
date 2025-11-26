// ✦ Plugin Kick LATAM ✦ Swill
// Diseñado por Mahykol ✦

var handler = async (m, { conn, participants, usedPrefix, command }) => {
  let mentionedJid = m.mentionedJid
  let user = mentionedJid && mentionedJid.length 
    ? mentionedJid[0] 
    : m.quoted && m.quoted.sender 
      ? m.quoted.sender 
      : null

  if (!user) return conn.reply(m.chat, `⚠️ Debes *mencionar* o *responder* a un usuario para expulsarlo.`, m)

  try {
    const groupInfo = await conn.groupMetadata(m.chat)
    const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
    const ownerBot = global.owner[0][0] + '@s.whatsapp.net'

    // Verificar si el usuario objetivo es admin
    const isAdminTarget = participants.some(p => p.id === user && p.admin)

    // Verificar si quien ejecuta el comando es roowner, owner o mod
    const isModSender =
      global.roowner?.includes(m.sender.replace(/@s.whatsapp.net/, '')) ||
      global.owner?.some(o => o[0] === m.sender.replace(/@s.whatsapp.net/, '')) ||
      global.mods?.includes(m.sender.replace(/@s.whatsapp.net/, ''))

    if (!isModSender) return conn.reply(m.chat, `🚫 No tienes permisos para usar *${usedPrefix}${command}*.`, m)

    if (user === conn.user.jid) return conn.reply(m.chat, `🤖 No puedo eliminar al *bot* del grupo.`, m)
    if (user === ownerGroup) return conn.reply(m.chat, `👑 No puedo eliminar al *propietario del grupo*.`, m)
    if (user === ownerBot) return conn.reply(m.chat, `🛡️ No puedo eliminar al *propietario del bot*.`, m)
    if (isAdminTarget) return conn.reply(m.chat, `⚔️ No puedes eliminar a un *admin* del grupo.`, m)

    // Resolver nombre del usuario
    let userName = conn.getName(user) || user.split('@')[0]

    // Expulsar al usuario
    await conn.groupParticipantsUpdate(m.chat, [user], 'remove')

    // Mensaje con estilo mejorado
    await conn.sendMessage(m.chat, { 
      text: `⛔️ Usuario *${userName}* ha sido expulsado correctamente ✅`, 
      mentions: [user] 
    }, { quoted: m })

  } catch (e) {
    conn.reply(m.chat, `⚠️ Error al expulsar al usuario.\nUsa *${usedPrefix}report* para informarlo.\n\n${e.message}`, m)
  }
}

handler.help = ['kick']
handler.tags = ['group']
handler.command = ['kick', 'echar', 'hechar', 'sacar', 'ban']
handler.group = true
handler.botAdmin = true

export default handler
