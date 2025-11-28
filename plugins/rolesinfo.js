// ✦ Roles Info LATAM ✦ Swill
// Diseñado por Mahykol ✦
// Versión avanzada con integración de permisos y roles dinámicos

import { ROLES } from '../lib/roles-config.js'
import { PERMISSIONS } from '../lib/permissions-config.js'

let handler = async (m, { conn }) => {

  let text = `🧩 *Información de Roles del Sistema LATAM ✦ Swill*\n\n`
  text += `Aquí tienes una descripción clara y profesional de cada rol, sus permisos y funciones dentro del sistema:\n\n`
  text += `━━━━━━━━━━━━━━━━━━\n`

  for (const roleId in ROLES) {
    const role = ROLES[roleId]

    text += `\n${role.icon || '🔹'} *${role.name}*\n`
    text += `📄 *Descripción:* ${role.description}\n\n`

    // Permisos del rol
    if (role.permissions?.length) {
      text += `🔐 *Permisos asignados:*\n`
      for (const permId of role.permissions) {
        const info = PERMISSIONS[permId]
        if (info) {
          text += `   • ✅ *${info.name}* — ${info.description}\n`
        } else {
          text += `   • ✅ ${permId}\n`
        }
      }
    } else {
      text += `🔐 *Permisos:* (ninguno asignado)\n`
    }

    // Notas adicionales
    if (role.notes?.length) {
      text += `\n📝 *Notas:*\n`
      for (const note of role.notes) {
        text += `   • ${note}\n`
      }
    }

    text += `\n━━━━━━━━━━━━━━━━━━\n`
  }

  text += `\nSi necesitas ver tus roles o permisos:\n`
  text += `• \`.misroles\` → muestra tus roles\n`
  text += `• \`.mipermisos\` → muestra tus permisos\n`
  text += `━━━━━━━━━━━━━━━━━━`

  return conn.reply(m.chat, text, m)
}

handler.help = ['rolesinfo']
handler.tags = ['roles']
handler.command = /^rolesinfo$/i

export default handler