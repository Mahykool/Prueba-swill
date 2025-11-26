// plugins/list-mods.js
import { listRole, toNum } from '../lib/lib-roles.js'
import { hasPermission } from '../lib/permissions-middleware.js'

var handler = async (m, { conn }) => {
  try {
    const sender = m.sender

    // ✅ Permitir acceso a:
    // - roowner
    // - owners
    // - mods
    // - usuarios con permiso "gestionar_roles"

    const isRowner = global.roowner?.includes(sender)
    const isOwner = global.owner?.some(o => o[0] === sender)
    const isMod = global.mods?.includes(sender)
    const hasManagePerm = hasPermission(sender, 'gestionar_roles')

    if (!isRowner && !isOwner && !isMod && !hasManagePerm) {
      return conn.reply(
        m.chat,
        '🚫 No tienes permisos para ver la lista de moderadores.',
        m
      )
    }

    // ✅ Obtener lista real de mods
    const arr = listRole('mods') || []
    if (!arr.length)
      return conn.reply(m.chat, 'ℹ️ No hay moderadores registrados.', m)

    const lines = arr.map((x, i) => {
      const jid = Array.isArray(x) ? x[0] : x
      return `${i + 1}. ${toNum(jid)}`
    })

    return conn.reply(
      m.chat,
      `📋 *Moderadores registrados:*\n\n${lines.join('\n')}`,
      m
    )

  } catch (e) {
    console.error('list-mods error', e)
    return conn.reply(m.chat, '❌ Error al listar moderadores.', m)
  }
}

handler.help = ['mods', 'listmods']
handler.tags = ['admin']
handler.command = /^(mods|listmods|list-mods)$/i

export default handler
