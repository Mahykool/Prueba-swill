// ✦ Plugin Kick / Ban LATAM ✦ Swill
// Diseñado por Mahykol ✦

import { requirePermission } from '../lib/permissions-middleware.js'

var handler = async (m, { conn, participants }) => {

  // ✅ Validación de permisos (middleware Swill)
  try {
    requirePermission(m, 'moderacion_avanzada')
  } catch {
    return conn.reply(m.chat, '🚫 No tienes permisos para usar este comando.', m)
  }

  // ✅ Resolver usuario objetivo (versión robusta)
  let user =
    m.mentionedJid?.[0] || // @mención
    m.quoted?.sender ||    // respuesta
    (m.text.includes('@')  // texto con @manual
      ? m.text.match(/@(\d{5,16})/)[1] + '@s.whatsapp.net'
      : null)

  if (!user) {
    return conn.reply(
      m.chat,
      `⚠️ Debes *mencionar*, *responder* o escribir *@número* para expulsar.`,
      m
    )
  }

  try {
    const groupInfo = await conn.groupMetadata(m.chat)
    const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'

    const isAdminTarget = participants.some(p => p.id === user && p.admin)

    // ✅ Roles del TARGET
    const isRowner   = global.roowner?.includes(user)
    const isOwnerBot = global.owner?.some(o => o[0] === user)
    const isMod      = global.mods?.includes(user)

    // ✅ Roles del EJECUTOR
    const sender = m.sender
    const senderIsRowner = global.roowner?.includes(sender)

    // ✅ No expulsar al bot
    if (user === conn.user.jid) {
      return conn.reply(m.chat, `🤖 No puedo eliminar al *bot*.`, m)
    }

    // ✅ Si NO eres ROOWNER → aplica protección anti-abuso
    if (!senderIsRowner) {

      if (isRowner) {
        return conn.reply(m.chat, `👑 No puedes eliminar al *ROOWNER* del bot.`, m)
      }

      if (isOwnerBot) {
        return conn.reply(m.chat, `🛡️ No puedes eliminar al *propietario del bot*.`, m)
      }

      if (user === ownerGroup) {
        return conn.reply(m.chat, `👑 No puedes eliminar al *propietario del grupo*.`, m)
      }

      if (isAdminTarget) {
        return conn.reply(m.chat, `⚔️ No puedes eliminar a un *admin del grupo*.`, m)
      }

      if (isMod) {
        return conn.reply(m.chat, `🛡️ No puedes eliminar a un *MOD* del bot.`, m)
      }
    }

    // ✅ Si el que ejecuta es ROOWNER → puede expulsar a cualquiera
    await conn.groupParticipantsUpdate(m.chat, [user], 'remove')

    const userName = await conn.getName(user)

    await conn.sendMessage(
      m.chat,
      {
        text: `⛔️ Usuario *${userName}* ha sido expulsado correctamente ✅`,
        mentions: [user]
      },
      { quoted: m }
    )

  } catch (e) {
    conn.reply(
      m.chat,
      `⚠️ Error al expulsar al usuario.\n${e.message}`,
      m
    )
  }
}

handler.help = ['kick']
handler.tags = ['admin']
handler.command = ['kick', 'echar', 'hechar', 'sacar', 'ban', 'mandaralgulag', 'chiiingar', 'Fuistee'] // alias
handler.group = true
handler.botAdmin = true

export default handler
