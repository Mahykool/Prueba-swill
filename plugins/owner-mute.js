// plugins/owner-mute.js
// Owner-mute / Shadowban plugin
// - Comandos: shadowban, unshadowban, mute, unmute
// - Uso: responder al mensaje del usuario objetivo
//   - shadowban 30   -> shadowban por 30 minutos
//   - shadowban      -> shadowban permanente
//   - unshadowban    -> quitar shadowban
// - Persiste en data/shadowbans.json
// - Usa el nuevo sistema de permisos (requireCommandAccess)
// - No requiere que el ejecutor sea admin del grupo (pero el bot necesita permisos para borrar mensajes)

import fs from 'fs'
import path from 'path'
import { requireCommandAccess } from '../lib/permissions-middleware.js'

const DATA_DIR = path.join(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'shadowbans.json')

// Título decorado solicitado
const PLUGIN_TITLE = 'ஓீ🐙 ㅤׄㅤׅㅤׄ *SHADOWBAN* ㅤ֢ㅤׄㅤׅ'

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }) } catch {}
}

/**
 * Estructura en memoria:
 * Map<jid, { expiresAt: number|null, timeoutId: Timeout|null, actor?: string, createdAt?: number }>
 */
let shadowMap = new Map()

function loadShadowbansFromDisk() {
  try {
    if (!fs.existsSync(FILE)) return
    const raw = fs.readFileSync(FILE, 'utf8')
    const arr = JSON.parse(raw || '[]')
    if (!Array.isArray(arr)) return
    const now = Date.now()
    for (const item of arr) {
      const jid = item.jid
      const expiresAt = item.expiresAt || null
      const actor = item.actor || null
      const createdAt = item.createdAt || null
      if (!jid) continue
      if (expiresAt && expiresAt <= now) continue
      shadowMap.set(jid, { expiresAt, timeoutId: null, actor, createdAt })
    }
  } catch (e) {
    console.warn('loadShadowbansFromDisk error', e)
  }
}

function saveShadowbansToDisk() {
  try {
    ensureDataDir()
    const arr = Array.from(shadowMap.entries()).map(([jid, v]) => ({
      jid,
      expiresAt: v.expiresAt || null,
      actor: v.actor || null,
      createdAt: v.createdAt || null
    }))
    fs.writeFileSync(FILE, JSON.stringify(arr, null, 2), 'utf8')
  } catch (e) {
    console.error('saveShadowbansToDisk error', e)
  }
}

function scheduleUnshadow(jid, ms) {
  const entry = shadowMap.get(jid)
  if (entry && entry.timeoutId) {
    clearTimeout(entry.timeoutId)
  }
  if (!ms || ms <= 0) return
  const timeoutId = setTimeout(() => {
    try {
      shadowMap.delete(jid)
      saveShadowbansToDisk()
    } catch (e) {
      console.error('scheduleUnshadow error', e)
    }
  }, ms)
  const current = shadowMap.get(jid) || {}
  current.timeoutId = timeoutId
  shadowMap.set(jid, current)
}

function scheduleAllTimeouts() {
  const now = Date.now()
  for (const [jid, v] of shadowMap.entries()) {
    if (v.expiresAt) {
      const ms = v.expiresAt - now
      if (ms <= 0) {
        shadowMap.delete(jid)
      } else {
        scheduleUnshadow(jid, ms)
      }
    }
  }
  saveShadowbansToDisk()
}

// Cargar al iniciar
loadShadowbansFromDisk()

const handler = async (m, { conn, usedPrefix, command }) => {
  const ctxErr = global.rcanalx || {
    contextInfo: {
      externalAdReply: {
        title: PLUGIN_TITLE,
        body: '❌ Error',
        thumbnailUrl: 'https://files.catbox.moe/zh5z6m.jpg',
        sourceUrl: global.canalOficial || ''
      }
    }
  }
  const ctxWarn = global.rcanalw || {
    contextInfo: {
      externalAdReply: {
        title: PLUGIN_TITLE,
        body: '⚠️ Advertencia',
        thumbnailUrl: 'https://files.catbox.moe/zh5z6m.jpg',
        sourceUrl: global.canalOficial || ''
      }
    }
  }
  const ctxOk = global.rcanalr || {
    contextInfo: {
      externalAdReply: {
        title: PLUGIN_TITLE,
        body: '✅ Acción',
        thumbnailUrl: 'https://qu.ax/QGAVS.jpg',
        sourceUrl: global.canalOficial || ''
      }
    }
  }

  // Verificar permisos con el sistema nuevo (cualquier usuario con el permiso podrá usarlo)
  try {
    // Ajusta 'moderation-plugin' si tu plugin-permissions.json usa otro pluginId
    requireCommandAccess(m.sender, 'moderation-plugin', 'shadowban')
  } catch (err) {
    return conn.reply(m.chat, '❌ No tienes permiso para usar este comando.', m, ctxErr)
  }

  // Debe responder a un mensaje objetivo
  let target
  if (m.quoted) {
    target = m.quoted.sender
  } else {
    return conn.reply(m.chat, '> *‼️ Responde al mensaje del usuario que quieres shadowbanear/unshadowbanear.*', m, ctxWarn)
  }

  // No permitir shadowban al bot
  const botJid = conn.user?.id || conn.user?.jid || null
  if (target === botJid) return conn.reply(m.chat, '> ❌ No puedes shadowbanear al bot.', m, ctxErr)

  // Intento de evitar shadowbanear administradores: comprobación tentativa (si falla, no bloquea)
  try {
    const meta = typeof conn.groupMetadata === 'function' ? await conn.groupMetadata(m.chat) : null
    if (meta && Array.isArray(meta.participants)) {
      const p = meta.participants.find(x => (x.id || x.jid || x.participant) === target)
      if (p && (p.admin || p.isAdmin || p.role === 'admin')) {
        return conn.reply(m.chat, '> ❌ No puedes shadowbanear a un administrador.', m, ctxErr)
      }
    }
  } catch (e) {
    // ignoramos errores de metadata
  }

  // Parsear argumento de duración en minutos
  const text = (m.text || '').trim()
  const parts = text.split(/\s+/).filter(Boolean)
  // parts[0] es el comando, parts[1] puede ser la duración
  const durationArg = parts[1] || ''
  const minutes = parseInt(durationArg, 10)
  const isDuration = !isNaN(minutes) && minutes > 0

  if (command === 'shadowban' || command === 'mute') {
    if (shadowMap.has(target)) {
      return conn.reply(m.chat, `> ⚠️ El usuario ya está shadowbaneado: @${target.split('@')[0]}`, m, { mentions: [target] }, ctxWarn)
    }

    let expiresAt = null
    if (isDuration) {
      expiresAt = Date.now() + minutes * 60 * 1000
    }

    const actor = m.sender || null
    const createdAt = Date.now()
    shadowMap.set(target, { expiresAt, timeoutId: null, actor, createdAt })
    saveShadowbansToDisk()

    if (isDuration) {
      scheduleUnshadow(target, expiresAt - Date.now())
      return conn.reply(m.chat, `> ✅ *Usuario shadowbaneado por ${minutes} minutos:* @${target.split('@')[0]}`, m, { mentions: [target] }, ctxOk)
    } else {
      return conn.reply(m.chat, `> ✅ *Usuario shadowbaneado permanentemente:* @${target.split('@')[0]}`, m, { mentions: [target] }, ctxOk)
    }
  } else if (command === 'unshadowban' || command === 'unmute') {
    if (!shadowMap.has(target)) {
      return conn.reply(m.chat, `> ⚠️ El usuario no está shadowbaneado: @${target.split('@')[0]}`, m, { mentions: [target] }, ctxWarn)
    }
    const entry = shadowMap.get(target)
    if (entry && entry.timeoutId) clearTimeout(entry.timeoutId)
    shadowMap.delete(target)
    saveShadowbansToDisk()
    return conn.reply(m.chat, `> ✅ *Usuario des-shadowbaneado:* @${target.split('@')[0]}`, m, { mentions: [target] }, ctxOk)
  }
}

// Antes de procesar otros handlers: eliminar mensajes de shadowbaneados (excepto stickers)
handler.before = async (m, { conn }) => {
  try {
    if (!m || !m.sender) return
    // Programar timeouts la primera vez que se usa el handler
    if (!handler._scheduled) {
      scheduleAllTimeouts()
      handler._scheduled = true
    }
    if (!shadowMap.has(m.sender)) return
    // Permitir stickers
    if (m.mtype === 'stickerMessage') return
    // Intentar borrar el mensaje; si falla (no admin), lo ignoramos
    try {
      if (typeof conn.sendMessage === 'function') {
        await conn.sendMessage(m.chat, { delete: m.key })
      }
    } catch (e) {
      // No hacemos nada si no se puede borrar (posible falta de permisos)
    }
  } catch (e) {
    console.error('shadowban before error', e)
  }
}

handler.help = ['shadowban', 'unshadowban']
handler.tags = ['moderation']
handler.command = ['shadowban', 'unshadowban', 'mute', 'unmute']
handler.group = true
// No forzamos que el bot sea admin; borrado es tentativa y silenciosa
handler.botAdmin = false

export default handler
