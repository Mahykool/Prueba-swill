// ✦ Roles Disponibles LATAM ✦ Swill
// Diseñado por Mahykol ✦

var handler = async (m, { conn }) => {

  const text = `
📚 *Roles disponibles en el sistema LATAM ✦ Swill*

Aquí tienes un resumen rápido de todos los roles existentes:

━━━━━━━━━━━━━━━━━━

👑 *ROOWNER*
• Control total del bot  
• Máxima autoridad  

🛡️ *OWNER*
• Administrador principal  
• Acceso a comandos avanzados  

🔧 *MOD*
• Moderación del grupo  
• Acceso a comandos de control  

💎 *PREMIUM*
• Beneficios especiales  
• Comandos exclusivos  

🎭 *SUITTAG*
• Etiquetado avanzado  
• Funciones especiales de tag  

🙍 *USUARIO*
• Comandos básicos  
• Sin permisos administrativos  

━━━━━━━━━━━━━━━━━━

ℹ️ Para ver información detallada de un rol:
• *Ejemplo:* \`.rolinfo mod\`

Para ver tus roles:
• \`.misroles\`

Para ver tus permisos:
• \`.mipermisos\`
`

  return conn.reply(m.chat, text, m)
}

handler.help = ['roles']
handler.tags = ['roles']
handler.command = /^roles$/i

export default handler
