// ✦ Plugin Kick / Ban LATAM ✦ Swill
// Diseñado por Mahykol ✦

import { requirePermission } from '../lib/permissions-middleware.js'

var handler = async (m, { conn, participants, usedPrefix, command }) => {
  // ✅ Validación de permisos (sin tocar el handler)
  try {
    requirePermission(m, 'moderacion_avanzada')
  } catch {
    return conn.reply(m.chat, '🚫 No tienes permisos para usar este comando.', m)
  }

  // ✅ Resolver usuario objetivo
  let user = m.mentionedJid?.[0]
    || m.quoted?.sender
    || null

  if (!user) {
    return conn.reply(
      m.chat,
      `⚠️ Debes *mencionar* o *responder* a un usuario para expulsarlo.`,
      m
    )
  }

  try {
    const groupInfo = await conn.groupMetadata(m.chat)
    const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
    const ownerBot = global.owner?.[0]?.[0] + '@s.whatsapp.net'

    const isAdminTarget = participants.some(p => p.id === user && p.admin)

    // ✅ Roles administrativos protegidos (NO se pueden expulsar)
    const isRowner   = global.roowner?.includes(user)
    const isOwnerBot = global.owner?.some(o => o[0] === user)
    const isMod      = global.mods?.includes(user)

    // ✅ No expulsar al bot
    if (user === conn.user.jid) {
      return conn.reply(m.chat, `🤖 No puedo eliminar al *bot*.`, m)
    }

    // ✅ No expulsar al ROOWNER
    if (isRowner) {
      return conn.reply(m.chat, `👑 No puedo eliminar al *ROOWNER* del bot.`, m)
    }

    // ✅ No expulsar al owner del bot
    if (isOwnerBot) {
      return conn.reply(m.chat, `🛡️ No puedo eliminar al *propietario del bot*.`, m)
    }

    // ✅ No expulsar al owner del grupo
    if (user === ownerGroup) {
      return conn.reply(m.chat, `👑 No puedo eliminar al *propietario del grupo*.`, m)
    }

    // ✅ No expulsar admins del grupo
    if (isAdminTarget) {
      return conn.reply(m.chat, `⚔️ No puedes eliminar a un *admin* del grupo*.`, m)
    }

    // ✅ No expulsar MODS del bot
    if (isMod) {
      return conn.reply(m.chat, `🛡️ No puedes eliminar a un *MOD* del bot.`, m)
    }

    // ✅ A partir de aquí:
    // - Puedes expulsar usuarios sin rol
    // - Y usuarios con roles “comunes”: premium, spa, vip, etc.

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
handler.tags = ['group']
handler.command = ['kick', 'echar', 'hechar', 'sacar', 'ban'] // 👈 Aquí ban es alias de kick
handler.group = true
handler.botAdmin = true

export default handler
