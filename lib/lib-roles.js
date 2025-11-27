// ✦ Sistema de Roles LATAM ✦ Swill
// Diseñado por Mahykol ✦
// Versión híbrida: roles.json + roles-config.js + permisos avanzados

import fs from 'fs/promises'
import path from 'path'
import { copyFile } from 'fs/promises'
import { fileURLToPath } from 'url'

import {
  readMods,
  saveMods,
  appendLog as appendModLog,
  toNum as toNumMods,
  jidFull as jidFullMods
} from './mods-utils.js'

import { ROLES } from './roles-config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_DIR = path.join(process.cwd(), 'src', 'database')
const ROLES_PATH = path.join(DB_DIR, 'roles.json')
const LOG_PATH = path.join(DB_DIR, 'admin-log.json')

// ✅ Inicialización de archivos
const ensureDbFiles = async () => {
  try {
    await fs.mkdir(DB_DIR, { recursive: true })

    try { await fs.access(ROLES_PATH) } catch {
      await fs.writeFile(ROLES_PATH, JSON.stringify({
        roowner: [],
        owners: [],
        suittag: [],
        prems: []
      }, null, 2))
    }

    try { await fs.access(LOG_PATH) } catch {
      await fs.writeFile(LOG_PATH, '[]')
    }

  } catch (e) {
    console.error('roles.ensureDbFiles error', e)
  }
}

// ✅ Utilidades
const toNum = jid => String(jid || '').replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, '')
const jidFull = num => (num && num.includes('@')) ? num : `${toNum(num)}@s.whatsapp.net`
const isValidNum = n => /^\d{6,15}$/.test(String(n || '').replace(/\D/g, ''))

const backupFile = async (filePath) => {
  try {
    const ts = Date.now()
    await copyFile(filePath, `${filePath}.bak.${ts}`).catch(() => {})
  } catch {}
}

let _rolesLock = false
const withLock = async (fn) => {
  while (_rolesLock) await new Promise(r => setTimeout(r, 50))
  _rolesLock = true
  try { return await fn() } finally { _rolesLock = false }
}

// ✅ Cargar roles.json + mods-utils
export const loadRoles = async () => {
  await ensureDbFiles()
  try {
    const raw = await fs.readFile(ROLES_PATH, 'utf8')
    const parsed = JSON.parse(raw || '{}')
    const modsRaw = readMods() || []

    const roles = {
      roowner: Array.isArray(parsed.roowner) ? parsed.roowner.map(toNum) : [],
      owners: Array.isArray(parsed.owners)
        ? parsed.owners.map(o => Array.isArray(o) ? [toNum(o[0]), o[1] || '', !!o[2]] : [toNum(o), '', false])
        : [],
      mods: Array.isArray(modsRaw) ? modsRaw.map(x => jidFullMods(x)) : [],
      suittag: Array.isArray(parsed.suittag) ? parsed.suittag.map(x => jidFull(x)) : [],
      prems: Array.isArray(parsed.prems) ? parsed.prems.map(x => jidFull(x)) : []
    }

    global.roles = roles
    return roles

  } catch (e) {
    console.error('roles.loadRoles error', e)
    global.roles = { roowner: [], owners: [], mods: [], suittag: [], prems: [] }
    return global.roles
  }
}

// ✅ Guardar roles.json
export const saveRoles = async (rolesObj) => {
  try {
    await ensureDbFiles()

    if (rolesObj.mods) {
      const modsToSave = rolesObj.mods.map(x => toNum(x) + '@s.whatsapp.net')
      await saveMods(modsToSave)
    }

    const toSave = {
      roowner: Array.from(new Set(rolesObj.roowner.map(toNum))),
      owners: rolesObj.owners.map(o => Array.isArray(o) ? [toNum(o[0]), o[1] || '', !!o[2]] : [toNum(o), '', false]),
      suittag: Array.from(new Set(rolesObj.suittag.map(n => toNum(n) + '@s.whatsapp.net'))),
      prems: Array.from(new Set(rolesObj.prems.map(n => toNum(n) + '@s.whatsapp.net')))
    }

    await withLock(async () => {
      await backupFile(ROLES_PATH)
      await fs.writeFile(ROLES_PATH, JSON.stringify(toSave, null, 2))
    })

    await loadRoles()
    return true

  } catch (e) {
    console.error('roles.saveRoles error', e)
    return false
  }
}

// ✅ Log administrativo
export const appendLog = async (entry) => {
  try {
    await ensureDbFiles()
    const raw = await fs.readFile(LOG_PATH, 'utf8')
    const arr = JSON.parse(raw || '[]')

    const normalized = {
      action: entry.action || 'unknown',
      type: entry.type || 'unknown',
      target: entry.target || null,
      actor: entry.actor || null,
      source: entry.source || null,
      reason: entry.reason || null,
      time: entry.time || Date.now()
    }

    arr.push(normalized)

    await withLock(async () => {
      await backupFile(LOG_PATH)
      await fs.writeFile(LOG_PATH, JSON.stringify(arr, null, 2))
    })

    if (normalized.type === 'mods' || (normalized.action && normalized.action.includes('mod'))) {
      appendModLog(normalized)
    }

  } catch (e) {
    console.error('roles.appendLog error', e)
  }
}

// ✅ API pública
export const listRole = (type) => {
  const roles = global.roles || { roowner: [], owners: [], mods: [], suittag: [], prems: [] }
  return roles[type] || []
}

export const hasRole = (type, jid) => {
  const num = toNum(jid)
  if (type === 'owners') return (global.roles?.owners || []).some(o => toNum(o[0]) === num)
  if (type === 'roowner') return (global.roles?.roowner || []).map(toNum).includes(num)
  return (global.roles?.[type] || []).map(x => toNum(x)).includes(num)
}

export const addRole = async (type, jid, meta = '', opts = {}) => {
  await loadRoles()
  const roles = global.roles
  const num = toNum(jid)

  if (!isValidNum(num)) throw new Error('INVALID_JID')

  if (type === 'owners') {
    if (roles.owners.some(o => toNum(o[0]) === num)) return false
    roles.owners.push([num, meta || '', true])
  } else if (type === 'roowner') {
    if (roles.roowner.includes(num)) return false
    roles.roowner.push(num)
  } else if (type === 'mods') {
    const full = jidFull(num)
    if (roles.mods.map(x => toNum(x)).includes(num)) return false
    roles.mods.push(full)
  } else {
    const full = jidFull(num)
    if ((roles[type] || []).map(x => toNum(x)).includes(num)) return false
    roles[type].push(full)
  }

  const ok = await saveRoles(roles)
  if (ok) {
    await appendLog({
      action: 'add_role',
      type,
      target: num,
      actor: opts.actor || null,
      source: opts.source || null,
      reason: opts.reason || null,
      time: Date.now()
    })
  }
  return ok
}

export const removeRole = async (type, jid, opts = {}) => {
  await loadRoles()
  const roles = global.roles
  const num = toNum(jid)

  if (!isValidNum(num)) throw new Error('INVALID_JID')

  if (type === 'owners') {
    if (!roles.owners.some(o => toNum(o[0]) === num)) return false
    roles.owners = roles.owners.filter(o => toNum(o[0]) !== num)
  } else if (type === 'roowner') {
    if (!roles.roowner.includes(num)) return false
    if (roles.roowner.length <= 1) throw new Error('CANNOT_REMOVE_LAST_ROOWNER')
    roles.roowner = roles.roowner.filter(x => x !== num)
  } else {
    roles[type] = (roles[type] || []).filter(x => toNum(x) !== num)
  }

  const ok = await saveRoles(roles)
  if (ok) {
    await appendLog({
      action: 'remove_role',
      type,
      target: num
