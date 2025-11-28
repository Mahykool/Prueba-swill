// lib/roles-sync.js
// Sincroniza roles desde lib-roles.js hacia variables globales
// para compatibilidad con el sistema legacy del bot.

import { loadRoles } from './lib-roles.js'

/**
 * Normaliza un valor a JID de usuario (si ya es JID lo deja igual).
 * Acepta: '56912345678', '56912345678@s.whatsapp.net', '1234' etc.
 */
function toUserJid(val) {
  if (!val && val !== 0) return null
  const s = String(val).trim()
  if (s.includes('@')) return s
  const digits = s.replace(/\D+/g, '')
  if (!digits) return null
  return `${digits}@s.whatsapp.net`
}

/**
 * Deduplifica un array de strings manteniendo orden.
 */
function dedupe(arr = []) {
  const seen = new Set()
  const out = []
  for (const v of arr) {
    if (!v) continue
    if (!seen.has(v)) { seen.add(v); out.push(v) }
  }
  return out
}

export async function syncRolesToGlobals() {
  try {
    const roles = (await loadRoles()) || {}

    // ROOWNER → global.roowner como JIDs completos
    const roownerRaw = Array.isArray(roles.roowner) ? roles.roowner : []
    global.roowner = dedupe(roownerRaw.map(toUserJid).filter(Boolean))

    // OWNERS → global.owner como [jid, tag, isDev]
    const ownersRaw = Array.isArray(roles.owners) ? roles.owners : []
    global.owner = ownersRaw.map(o => {
      // o puede ser [id, tag, isDev] o string id
      if (Array.isArray(o)) {
        const jid = toUserJid(o[0]) || ''
        return [jid, o[1] || '', !!o[2]]
      } else {
        return [toUserJid(o) || '', '', false]
      }
    }).filter(x => x[0]).reduce((acc, cur) => { acc.push(cur); return acc }, [])
    // dedupe owners by jid (keep first occurrence)
    const seenOwners = new Set()
    global.owner = global.owner.filter(([jid]) => {
      if (seenOwners.has(jid)) return false
      seenOwners.add(jid)
      return true
    })

    // MODS → global.mods (normaliza y dedup)
    const modsRaw = Array.isArray(roles.mods) ? roles.mods : []
    global.mods = dedupe(modsRaw.map(toUserJid).filter(Boolean))

    // SUITTAG → global.suittag
    const suittagRaw = Array.isArray(roles.suittag) ? roles.suittag : []
    global.suittag = dedupe(suittagRaw.map(toUserJid).filter(Boolean))

    // PREMS → global.prems
    const premsRaw = Array.isArray(roles.prems) ? roles.prems : []
    global.prems = dedupe(premsRaw.map(toUserJid).filter(Boolean))

    return {
      roowner: global.roowner,
      owner: global.owner,
      mods: global.mods,
      suittag: global.suittag,
      prems: global.prems
    }
  } catch (e) {
    console.error('syncRolesToGlobals error:', e)
    // Asegura que las variables globales existan aunque falle
    global.roowner = global.roowner || []
    global.owner = global.owner || []
    global.mods = global.mods || []
    global.suittag = global.suittag || []
    global.prems = global.prems || []
    return null
  }
}

export default { syncRolesToGlobals }
