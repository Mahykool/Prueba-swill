// plugins/kick.js - Parche de normalización y comprobaciones
var handler = async (m, { conn, usedPrefix, command }) => {
  // Helper: normalizar a JID completo
  const toJid = (jidOrNum) => {
    if (!jidOrNum) return null
    jidOrNum = String(jidOrNum)
    if (jidOrNum.endsWith('@s.whatsapp.net') || jidOrNum.endsWith('@g.us')) return jidOrNum
    const onlyNums = jidOrNum.replace(/[^0-9]/g, '')
    return onlyNums.length ? `${onlyNums}@s.whatsapp.net` : null
  }

  // Resolver objetivo: m.mentionedJid -> quoted -> args (si usas args)
  let mentionedJid = Array.isArray(m.mentionedJid) && m.mentionedJid.length ? m.mentionedJid[0] : null
  let user = mentionedJid || (m.quoted && (m.quoted.sender || m.quoted.key?.participant)) || null
  user = toJid(user)

  if (!user) return conn.reply(m.chat, `⚠️ Debes *mencionar* o *responder* a un usuario para expulsarlo.`, m)

  try {
    // Obtener metadata del grupo (asegura participants actualizados)
    const groupInfo = await conn.groupMetadata(m.chat)
    const participants = Array.isArray(groupInfo?.participants) ? groupInfo.participants : []
    const ownerGroup = toJid(groupInfo?.owner) || toJid(String(m.chat).split`-`[0])
    const ownerBot = toJid((global.owner && global.owner[0] && global.owner[0][0]) ? global.owner[0][0] : null)

    // Verificar si el usuario objetivo es admin (considera varios formatos)
    const isAdminTarget = participants.some(p => {
      const pid = p.id || p.jid || p.participant
      const adminFlag = p.admin
      return toJid(pid) === user && (adminFlag === 'admin' || adminFlag === 'superadmin' || adminFlag === true)
    })

    // Normalizar sender y comparar con roles guardados (asumimos global.mods con JIDs completos)
    const senderJid = toJid(m.sender)
    const isModSender =
      (Array.isArray(global.roowner) && global.roowner.includes((senderJid || '').replace('@s.whatsapp.net', ''))) ||
      (Array.isArray(global.owner) && global.owner.some(o => toJid(o[0]) === senderJid)) ||
      (Array.isArray(global.mods) && global.mods.includes(senderJid))

    if (!isModSender) return conn.reply(m.chat, `🚫 No tienes permisos para usar *${usedPrefix}${command}*.`, m)

    // Protecciones básicas
    if (user === conn.user?.id || user === conn.user?.jid) return conn.reply(m.chat, `🤖 No puedo eliminar al *bot* del grupo.`, m)
    if (user === ownerGroup) return conn.reply(m.chat, `👑 No puedo eliminar al *propietario del grupo*.`, m)
    if (ownerBot && user === ownerBot) return conn.reply(m.chat, `🛡️ No puedo eliminar al *propietario del bot*.`, m)
    if (isAdminTarget) return conn.reply(m.chat, `⚔️ No puedes eliminar a un *admin* del grupo.`, m)

    // Verificar que el bot sea admin
    const botJid = conn.user?.id || conn.user?.jid
    const botParticipant = participants.find(p => toJid(p.id || p.jid || p.participant) === toJid(botJid))
    const botIsAdmin = botParticipant && (botParticipant.admin === 'admin' || botParticipant.admin === 'superadmin' || botParticipant.admin === true)
    if (!botIsAdmin) return conn.reply(m.chat, '❌ Necesito ser admin para expulsar usuarios.', m)

    // Verificar que el target esté en el grupo
    const targetInGroup = participants.some(p => toJid(p.id || p.jid || p.participant) === user)
    if (!targetInGroup) return conn.reply(m.chat, '❌ El usuario no está en este grupo.', m)

    // Resolver nombre del usuario
    let userName = await conn.getName(user).catch(() => null) || (user.split('@')[0])

    // Ejecutar expulsión
    await conn.groupParticipantsUpdate(m.chat, [user], 'remove')

    // Mensaje con mención
    await conn.sendMessage(m.chat, {
      text: `⛔️ Usuario *${userName}* ha sido expulsado correctamente ✅`,
      mentions: [user]
    }, { quoted: m })

    // Registrar en admin-log si existe la función
    if (typeof global.appendAdminLog === 'function') {
      try {
        await global.appendAdminLog({
          action: 'kick',
          actor: senderJid,
          target: user,
          chat: m.chat,
          time: new Date().toISOString(),
          reason: `${usedPrefix}${command}`
        })
      } catch (err) { console.error('appendAdminLog error', err) }
    }

  } catch (e) {
    console.error('kick handler error:', e)
    conn.reply(m.chat, `⚠️ Error al expulsar al usuario.\nUsa *${usedPrefix}report* para informarlo.\n\n${e.message || e}`, m)
  }
}

handler.help = ['kick']
handler.tags = ['group']
handler.command = ['kick', 'echar', 'hechar', 'sacar', 'ban']
handler.group = true
handler.botAdmin = true

export default handler
