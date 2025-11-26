// plugins/list-mods.js
import { listRole, toNum } from '../lib/lib-roles.js'

var handler = async (m, { conn }) => {
  try {
    const arr = listRole('mods') || []
    if (!arr.length) return conn.reply(m.chat, 'ℹ️ No hay moderadores registrados.', m)

    const lines = arr.map((x, i) => {
      const jid = Array.isArray(x) ? x[0] : x
      return `${i + 1}. ${toNum(jid)}`
    })

    return conn.reply(m.chat, `📋 Moderadores:\n\n${lines.join('\n')}`, m)
  } catch (e) {
    console.error('list-mods error', e)
    return conn.reply(m.chat, '❌ Error al listar moderadores.', m)
  }
}

handler.help = ['mods', 'listmods']
handler.tags = ['admin']
handler.command = /^(mods|listmods|list-mods)$/i
handler.owner = true
export default handler