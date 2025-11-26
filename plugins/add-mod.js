// plugins/add-mod.js
import { addRole, toNum, jidFull } from '../lib/lib-roles.js'
import { requireRoowner } from '../lib/permissions-middleware.js'

const resolveTarget = (m, text) => {
  // 1) m.mentionedJid (array)
  if (m.mentionedJid && m.mentionedJid.length) return m.mentionedJid[0]
  // 2) quoted message sender
  if (m.quoted && m.quoted.sender) return m.quoted.sender
  // 3) plain text number (first token)
  if (text && text.trim()) {
    const t = text.trim().split(/\s+/)[0]
    return t.includes('@') ? t : `${t.replace(/\D/g, '')}@s.whatsapp.net`
  }
  return null
}

var handler = async (m, { conn, text, usedPrefix, command }) => {
  try {
    requireRoowner(m)
    const targetJid = resolveTarget(m, text)
    if (!targetJid) return conn.reply(m.chat, `Uso: ${usedPrefix}${command} 569XXXXXXXX o responde/menciona al usuario.`, m)

    const ok = await addRole('mods', targetJid)
    if (!ok) return conn.reply(m.chat, `ℹ️ ${toNum(targetJid)} ya es moderador o ocurrió un error.`, m)

    return conn.reply(m.chat, `✅ ${toNum(targetJid)} agregado como moderador.`, m)
  } catch (e) {
    if (e && e.message === 'NO_ROOWNER') return conn.reply(m.chat, '🚫 Solo el roowner puede usar este comando.', m)
    console.error('add-mod error', e)
    return conn.reply(m.chat, '❌ Error interno al intentar agregar moderador.', m)
  }
}

handler.help = ['addmod 569XXXXXXXX']
handler.tags = ['admin']
handler.command = /^(addmod|promote|agregarmod|mod\+)$/i
handler.rowner = true
export default handler