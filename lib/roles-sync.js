// roles-sync.js
// Sincroniza roles desde lib-roles.js hacia variables globales
// para compatibilidad con el sistema legacy del bot.

const { loadRoles } = require('./lib-roles.js')

const syncRolesToGlobals = async () => {
  const roles = await loadRoles()

  // ROOWNER → global.roowner como JIDs completos
  global.roowner = (roles.roowner || []).map(n => `${n}@s.whatsapp.net`)

  // OWNERS → global.owner como [jid, tag, isDev]
  global.owner = (roles.owners || []).map(o => [
    `${o[0]}@s.whatsapp.net`,
    o[1] || '',
    !!o[2]
  ])

  // MODS → global.mods (ya vienen como JID completo)
  global.mods = (roles.mods || []).map(j => j)

  // SUITTAG → global.suittag
  global.suittag = (roles.suittag || []).map(j => j)

  // PREMS → global.prems
  global.prems = (roles.prems || []).map(j => j)
}

module.exports = {
  syncRolesToGlobals
}
