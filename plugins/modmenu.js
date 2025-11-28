// ✦ Menú de Moderación LATAM ✦ Swill
// Diseñado por Mahykol ✦

import { toNum } from '../lib/lib-roles.js'
import { hasPermission } from '../lib/permissions-middleware.js'

let handler = async (m, { conn }) => {

  const user = m.sender

  // ✅ Roles
  const isMod = global.mods?.includes(user)
  const isOwner = global.owner?.some(o => o[0] === user)
  const isRowner = global.roowner?.includes(user)

  const status = isRowner
    ? '👑 ROOWNER'
    : isOwner
    ? '🛡️ OWNER'
    : isMod
    ? '🔧 MOD'
    : '🙍 Usuario común'

  // ✅ Lista de mods
  const mods = global.mods || []
  const modList = mods.length
    ? mods.map((jid, i) => `${i + 1}. ${toNum(jid)}`).join('\n')
    : 'No hay moderadores registrados.'

  // ✅ Mostrar solo si tiene permisos
  if (!isMod && !isOwner && !isRowner)
    return conn.reply(m.chat, '🛡️ *No tienes permisos para ver este menú.*', m)

  const text = `
🧩 *Menú de Moderación LATAM ✦ Swill*

👤 *Tu estado:* ${status}

━━━━━━━━━━━━━━━━━━
🛡️ *Herramientas de Moderación*

🛑 *SHOWBAN (Mute temporal)*
• showban <tiempo> [razón]
   Mutear usuario con tiempo personalizado.
   Ej: showban 10m spam

✅ *DESHADOWBAN (Desmute)*
• deshadowban
• desmute
• quitarmute
• unmute
   Desmutea al usuario seleccionado.

📋 *Lista de muteados*
• mutelist
   Muestra quiénes están muteados y cuánto falta.

📄 *Registro de acciones*
• mutelog
   Últimas 20 acciones de mute/desmute.

🔍 *Estado de mute*
• mutestatus
   Ver si un usuario está muteado.

🧹 *Limpiar registro (solo ROOWNER)*
• clearmutelog
   Limpia todo el registro de mute.

━━━━━━━━━━━━━━━━━━
🔧 *Gestión de Moderadores*

📋 *Lista de Mods*
${modList}

➕ *Agregar Mod*
• addmod @usuario

➖ *Remover Mod*
• removemod @usuario

━━━━━━━━━━━━━━━━━━
📚 *Roles & Permisos*

🧩 *Mis roles*
• misroles

🔐 *Mis permisos*
• mipermisos

📘 *Información de roles*
• roles
• rolesinfo
• rolinfo <rol>

━━━━━━━━━━━━━━━━━━
✦ Sistema Swill ✦ LATAM ✦
`

  return conn.reply(m.chat, text, m)
}

handler.help = ['modmenu']
handler.tags = ['admin']
handler.command = /^modmenu$/i

export default handler
