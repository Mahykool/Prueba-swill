// roles-sync.js
import { loadRoles } from './lib-roles.js'

export async function syncRolesToGlobals() {
  const roles = await loadRoles()

  // ROOWNER
  global.roowner = roles.roowner.map(n => `${n}@s.whatsapp.net`)

  // OWNERS
  global.owner = roles.owners.map(o => [
    `${o[0]}@s.whatsapp.net`,
    o[1] || '',
    !!o[2]
  ])

  // MODS
  global.mods = roles.mods.map(j => j)

  // SUITTAG
  global.suittag = roles.suittag.map(j => j)

  // PREMS
  global.prems = roles.prems.map(j => j)
}