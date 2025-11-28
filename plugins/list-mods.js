// plugins/list-mods.js
import { listRole, toNum } from '../lib/lib-roles.js'

var handler = async (m, { conn, usedPrefix }) => {
  try {
    const arr = listRole('mods') || []
    if (!arr.length) return conn.reply(m.chat, 'ℹ️ No hay moderadores registrados.', m)

    const lines = arr.map((x, i) => {
      // Acepta tanto ['num','meta'] como 'num@s.whatsapp.net'
      const jid = Array.isArray(x) ? (x[0] || '') : (x || '')
      return `${i + 1}. ${toNum(jid)}`
    })

    const text = `📋 Moderadores (${lines.length}):\n\n${lines.join('\n')}\n\nUsa ${usedPrefix || '.'}addmod para agregar uno.`
    return conn.reply(m.chat, text, m)
  } catch (e) {
    console.error('list-mods error', e)
    return conn.reply(m.chat, '❌ Error al listar moderadores.', m)
  }
}

handler.help = ['mods', 'listmods']
handler.tags = ['admin']
// Opciones de restricción: elige la que quieras
handler.owner = true         // solo owner (actual)
handler.rowner = true    // solo roowner (descomenta si prefieres)
 // handler.group = false    // si quieres restringir a grupos
export default handler
