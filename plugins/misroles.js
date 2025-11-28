// ✦ Mis Roles LATAM ✦ Swill
// Diseñado por Mahykol ✦

import { toNum } from '../lib/lib-roles.js'

var handler = async (m, { conn }) => {
  const user = m.sender

  const roles = []

  if (global.roowner?.includes(user)) roles.push('👑 ROOWNER')
  if (global.owner?.some(o => o[0] === user)) roles.push('🛡️ OWNER')
  if (global.mods?.includes(user)) roles.push('🔧 MOD')
  if (global.prems?.includes(user)) roles.push('💎 PREMIUM')
  if (global.suittag?.includes(user)) roles.push('🎭 SUITTAG')

  // Si no tiene roles administrativos
  if (!roles.length) roles.push('🙍 Usuario común')

  const name = await conn.getName(user)

  return conn.reply(
    m.chat,
    `🧩 *Roles de ${name}:*\n\n${roles.map(r => '• ' + r).join('\n')}`,
    m
  )
}

handler.help = ['misroles']
handler.tags = ['roles']
handler.command = /^misroles$/i

export default handler
