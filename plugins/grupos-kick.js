var handler = async (m, { conn, participants, usedPrefix, command }) => {
let mentionedJid = await m.mentionedJid
let user = mentionedJid && mentionedJid.length ? mentionedJid[0] : m.quoted && await m.quoted.sender ? await m.quoted.sender : null
if (!user) return conn.reply(m.chat, `> Debes mencionar o responder a un usuario para expulsarlo.`, m)

try {
const groupInfo = await conn.groupMetadata(m.chat)
const ownerGroup = groupInfo.owner || m.chat.split`-`[0] + '@s.whatsapp.net'
const ownerBot = global.owner[0][0] + '@s.whatsapp.net'

if (user === conn.user.jid) return conn.reply(m.chat, `> No puedo eliminar el bot del grupo.`, m)
if (user === ownerGroup) return conn.reply(m.chat, `> No puedo eliminar al propietario del grupo.`, m)
if (user === ownerBot) return conn.reply(m.chat, `> No puedo eliminar al propietario del bot.`, m)

// Expulsar al usuario
await conn.groupParticipantsUpdate(m.chat, [user], 'remove')

// Mensaje rápido mencionando al usuario eliminado
await conn.sendMessage(m.chat, { 
text: `> ⛔️ ha sido expulsado del grupo Correctamente ✅️`,
mentions: [user]
}, { quoted: m })

} catch (e) {
conn.reply(m.chat, `> ⚠︎ Error al expulsar al usuario.\n> Usa *${usedPrefix}report* para informarlo.\n\n${e.message}`, m)
}}

handler.help = ['kick']
handler.tags = ['group']
handler.command = ['kick', 'echar', 'hechar','sacar', 'ban']
handler.admin = true
handler.group = true
handler.botAdmin = true

export default handler