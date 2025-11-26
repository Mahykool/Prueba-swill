// ✦ Rol Info LATAM ✦ Swill
// Diseñado por Mahykol ✦

var handler = async (m, { conn, args }) => {
  const rol = (args[0] || '').toLowerCase()

  if (!rol)
    return conn.reply(m.chat, '⚠️ Debes indicar un rol.\nEjemplo: `.rolinfo mod`', m)

  const roles = {
    roowner: `
👑 *ROOWNER*
━━━━━━━━━━━━━━━━━━
• Máxima autoridad del sistema  
• Control total del bot  
• Puede agregar/quitar owners y mods  
• Puede cambiar configuraciones internas  
• Acceso a todos los comandos  
• No puede ser expulsado ni limitado  
    `,

    owner: `
🛡️ *OWNER*
━━━━━━━━━━━━━━━━━━
• Administrador principal del bot  
• Puede usar comandos avanzados  
• Puede gestionar configuraciones importantes  
• No puede modificar al ROOWNER  
• No puede agregar nuevos owners  
• No puede ser expulsado por mods  
    `,

    mod: `
🔧 *MOD (Moderador)*
━━━━━━━━━━━━━━━━━━
• Encargado de la moderación del grupo  
• Puede usar kick, mute, warn, etc.  
• No puede gestionar roles  
• No puede usar comandos administrativos del bot  
• No puede expulsar owners ni roowner  
    `,

    premium: `
💎 *PREMIUM*
━━━━━━━━━━━━━━━━━━
• Acceso a funciones especiales  
• Comandos exclusivos o ilimitados  
• No tiene permisos administrativos  
• No puede moderar ni gestionar roles  
    `,

    suittag: `
🎭 *SUITTAG*
━━━━━━━━━━━━━━━━━━
• Acceso a comandos especiales de etiquetado  
• Funciones avanzadas de tag masivo  
• No tiene permisos administrativos  
    `,

    usuario: `
🙍 *Usuario Común*
━━━━━━━━━━━━━━━━━━
• Acceso a comandos básicos  
• Sin permisos especiales  
• Sin funciones administrativas  
    `
  }

  // ✅ Resolver alias
  const alias = {
    'ro': 'roowner',
    'root': 'roowner',
    'dueño': 'owner',
    'owner': 'owner',
    'mod': 'mod',
    'moderador': 'mod',
    'premium': 'premium',
    'vip': 'premium',
    'spa': 'premium',
    'suittag': 'suittag',
    'tag': 'suittag',
    'user': 'usuario',
    'usuario': 'usuario'
  }

  const key = alias[rol] || rol

  if (!roles[key])
    return conn.reply(m.chat, `❌ Rol desconocido: *${rol}*\nUsa: roowner, owner, mod, premium, suittag, usuario`, m)

  return conn.reply(m.chat, roles[key], m)
}

handler.help = ['rolinfo <rol>']
handler.tags = ['info']
handler.command = /^rolinfo$/i

export default handler