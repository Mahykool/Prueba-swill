// lib/mods-utils.js
import fs from 'fs'
import path from 'path'

const DB_DIR = path.join(process.cwd(), 'src', 'database')
const MODS_PATH = path.join(DB_DIR, 'mods.json')
const LOG_PATH = path.join(DB_DIR, 'admin-log.json')

const ensureDbFolder = () => {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true })
  if (!fs.existsSync(MODS_PATH)) fs.writeFileSync(MODS_PATH, '[]')
  if (!fs.existsSync(LOG_PATH)) fs.writeFileSync(LOG_PATH, '[]')
}

const normalize = n => String(n || '').replace(/@s\.whatsapp\.net/g, '') + '@s.whatsapp.net'

const readMods = () => {
  try {
    ensureDbFolder()
    const raw = fs.readFileSync(MODS_PATH, 'utf8') || '[]'
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.map(normalize) : []
  } catch (e) {
    console.error('readMods error', e)
    return []
  }
}

const saveMods = (arr) => {
  try {
    ensureDbFolder()
    const unique = Array.from(new Set((arr || []).map(normalize)))
    fs.writeFileSync(MODS_PATH, JSON.stringify(unique, null, 2))
    global.mods = unique
    return unique
  } catch (e) {
    console.error('saveMods error', e)
    return null
  }
}

const appendLog = (entry) => {
  try {
    ensureDbFolder()
    const raw = fs.readFileSync(LOG_PATH, 'utf8') || '[]'
    const arr = JSON.parse(raw)
    arr.push(entry)
    fs.writeFileSync(LOG_PATH, JSON.stringify(arr, null, 2))
  } catch (e) {
    console.error('appendLog error', e)
  }
}

const toNum = jid => String(jid || '').replace(/@s\.whatsapp\.net/g, '')
const jidFull = num => (num && num.includes('@')) ? num : `${toNum(num)}@s.whatsapp.net`

const resolveTargetJid = (m, text, mentionedJid) => {
  if (mentionedJid && mentionedJid.length) return mentionedJid[0]
  if (m.quoted && m.quoted.sender) return m.quoted.sender
  if (text && text.trim()) {
    const t = text.trim().split(/\s+/)[0]
    return t.includes('@') ? t : `${t}@s.whatsapp.net`
  }
  return null
}

const isRoOwner = jid => global.roowner?.includes(toNum(jid))
const isOwnerBot = jid => global.owner?.some(o => toNum(o[0]) === toNum(jid))

export {
  readMods, saveMods, appendLog, normalize, toNum, jidFull,
  resolveTargetJid, isRoOwner, isOwnerBot
}