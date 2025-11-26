// ✦ Mis Permisos LATAM ✦ Swill
// Diseñado por Mahykol ✦

import { hasPermission, listAllPermissions, getPermissionInfo } from '../lib/permissions-middleware.js'

let handler = async (m, { conn }) => {
  const user = m.sender
  const allPerms = listAllPermissions() // IDs de permisos
  const active = []

  for (const permId of allPerms) {
    if (hasPermission(user, permId)) {
      const info = getPermissionInfo(permId) || {}
      const name = info.name || permId
      const desc = info.description || 'Sin descripción'
      active.push(`✅ *${name}*\n   • ${desc}`)
    }
  }

  if (!active.length) {
    active.push('❌ No tienes permisos especiales.')
  }

  const name = await conn.getName(user)

  return conn.reply(
    m.chat,
    `🔐 *Permisos de ${name}:*\n\n${active.join('\n\n')}`,
    m
  )
}

handler.help = ['mipermisos']
handler.tags = ['info']
handler.command = /^mipermisos$/i

export default handler