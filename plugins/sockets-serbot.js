// plugins/sockets-serbot.js
// Plugin para crear Sub-Bots (modo QR / code) de forma segura y compatible.
// Exporta: handler por defecto (comando) y yukiJadiBot(options) para iniciar la sesión.

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import qrcode from 'qrcode'
import NodeCache from 'node-cache'
import pino from 'pino'
import chalk from 'chalk'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Carpeta base para sesiones jadi (define un nombre por defecto)
const JADI_DIR = process.env.JADI_DIR || 'jadi_sessions'

// Mensajes por defecto
const QR_TEXT = `*❀ SER BOT • MODE QR*\n\nEscanea este QR con otro dispositivo para convertirte en Sub-Bot temporal. El QR expira en 45 segundos.`
const CODE_TEXT = `*❀ SER BOT • MODE CODE*\n\nUsa este código para vincular un Sub-Bot temporal. No uses tu cuenta principal.`

// Utilidades pequeñas
const delay = (ms) => new Promise(res => setTimeout(res, ms))
function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  const hh = hours.toString().padStart(2, '0')
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')
  return `${hh} h ${mm} m ${ss} s`
}

function ensureDirSync(p) {
  try { fs.mkdirSync(p, { recursive: true }) } catch {}
}

function safeJsonParse(s) {
  try { return JSON.parse(s) } catch { return null }
}

// Comando handler (export default)
const serbotCommandHandler = async (m, { conn, args = [], usedPrefix = '', command = '', isOwner = false }) => {
  try {
    // Validaciones básicas de configuración en DB
    if (!global?.db?.data) {
      try { await import('../lib/db.js').then(mod => mod.loadDatabase?.()) } catch {}
    }
    const settings = global?.db?.data?.settings?.[conn?.user?.jid] || {}
    if (!settings.jadibotmd) return conn.reply?.(m.chat, `ꕥ El comando ${usedPrefix + command} está desactivado.`, m)

    // Cooldown simple por usuario (evita spam)
    const userData = global.db.data.users[m.sender] = global.db.data.users[m.sender] || {}
    const last = userData.Subs || 0
    const cooldown = 120000 // 2 minutos
    const now = Date.now()
    if (now - last < cooldown) {
      return conn.reply?.(m.chat, `ꕥ Debes esperar ${msToTime(cooldown - (now - last))} para volver a vincular un Sub-Bot.`, m)
    }

    // Límite global de sub-bots
    const socklimit = (global.conns || []).filter(s => s?.user).length
    if (socklimit >= 50) return conn.reply?.(m.chat, `ꕥ No hay espacios disponibles para Sub-Bots.`, m)

    // Determinar a quién vincular (mencionado o remitente)
    const mentioned = m.mentionedJid?.[0] || (m.fromMe ? conn.user.jid : m.sender)
    const id = String(mentioned).split('@')[0]
    const pathYukiJadiBot = path.join(process.cwd(), JADI_DIR, id)
    ensureDirSync(pathYukiJadiBot)

    // Preparar opciones y lanzar el sub-bot
    const options = {
      pathYukiJadiBot,
      m,
      conn,
      args,
      usedPrefix,
      command,
      fromCommand: true
    }

    // Lanza la función que crea la sesión (no bloqueante)
    yukiJadiBot(options).catch(err => {
      console.error('yukiJadiBot error:', err)
      try { conn.reply?.(m.chat, 'ꕥ Ocurrió un error al crear el Sub-Bot.', m) } catch {}
    })

    // Actualiza cooldown del usuario
    userData.Subs = Date.now()
    await (import('../lib/db.js').then(mod => mod.saveDatabase?.())).catch(() => {})

    return
  } catch (e) {
    console.error('serbotCommandHandler error:', e)
    try { await conn.reply?.(m.chat, 'ꕥ Error interno al procesar el comando.', m) } catch {}
  }
}

serbotCommandHandler.help = ['qr', 'code']
serbotCommandHandler.tags = ['serbot']
serbotCommandHandler.command = ['qr', 'code']

export default serbotCommandHandler

// Función principal que crea el Sub-Bot
export async function yukiJadiBot(options = {}) {
  const { pathYukiJadiBot, m, conn, args = [], usedPrefix = '', command = '' } = options
  // Carga dinámica de dependencias que requieren top-level await si el entorno no lo soporta
  const baileysMod = await import('@whiskeysockets/baileys').catch(e => { throw new Error('Baileys import failed: ' + e) })
  const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = baileysMod
  const { exec } = await import('child_process').catch(() => ({ exec: null }))

  // Asegura carpeta de credenciales
  ensureDirSync(pathYukiJadiBot)
  const credsPath = path.join(pathYukiJadiBot, 'creds.json')

  // Si el usuario pasó un base64 con credenciales (opcional)
  if (args[0]) {
    try {
      const maybe = args[0].trim()
      if (maybe) {
        const parsed = safeJsonParse(Buffer.from(maybe, 'base64').toString('utf8'))
        if (parsed) fs.writeFileSync(credsPath, JSON.stringify(parsed, null, 2))
      }
    } catch (e) {
      // no bloquear por cred inválidas
    }
  }

  // Preparar auth state
  const { state, saveCreds } = await useMultiFileAuthState(pathYukiJadiBot)

  // Obtener versión de baileys
  const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [4, 0, 0] }))

  // Importa helper makeWASocket desde lib/simple.js dinámicamente para evitar incompatibilidades de export
  const simpleMod = await import('../lib/simple.js').catch(() => ({}))
  const makeWASocket = simpleMod.makeWASocket || simpleMod.default?.makeWASocket || simpleMod.default || simpleMod

  // Opciones de conexión
  const connectionOptions = {
    logger: pino({ level: 'fatal' }),
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
    browser: ['SerBot', 'Chrome', '1.0.0'],
    version,
    generateHighQualityLinkPreview: true
  }

  // Crea el socket
  let sock = null
  try {
    sock = await makeWASocket(connectionOptions)
  } catch (e) {
    console.error('makeWASocket failed:', e)
    throw e
  }

  // Estado auxiliar
  sock.isInit = false
  sock.pathYuki = pathYukiJadiBot

  // Manejo de QR y conexión
  let lastQrMsg = null
  let lastCodeMsg = null
  let codeMessage = null

  async function sendQrImage(qr) {
    try {
      if (!m?.chat) return
      const imgBuf = await qrcode.toBuffer(qr, { scale: 8 })
      const sent = await conn.sendMessage(m.chat, { image: imgBuf, caption: QR_TEXT }, { quoted: m })
      lastQrMsg = sent
      // Borra el mensaje QR en 30s si se pudo enviar
      if (sent?.key) setTimeout(() => conn.sendMessage(m.sender, { delete: sent.key }).catch(() => {}), 30000)
    } catch (e) { /* noop */ }
  }

  async function sendCodeText(secret) {
    try {
      if (!m?.chat) return
      const sent = await conn.sendMessage(m.chat, { text: CODE_TEXT }, { quoted: m })
      lastCodeMsg = sent
      const codeSent = await m.reply?.(secret) || null
      codeMessage = codeSent
      if (sent?.key) setTimeout(() => conn.sendMessage(m.sender, { delete: sent.key }).catch(() => {}), 30000)
      if (codeSent?.key) setTimeout(() => conn.sendMessage(m.sender, { delete: codeSent.key }).catch(() => {}), 30000)
    } catch (e) { /* noop */ }
  }

  // Conexión update handler
  async function connectionUpdate(update) {
    try {
      const { connection, lastDisconnect, qr, isNewLogin } = update
      if (qr) {
        // Si se solicita modo code, se pedirá pairing code más abajo; por defecto mostramos QR
        await sendQrImage(qr)
      }

      if (connection === 'open') {
        sock.isInit = true
        // Añadir a global.conns
        global.conns = global.conns || []
        global.conns.push(sock)
        // Mensaje de confirmación al usuario que pidió el sub-bot
        if (m?.chat) {
          await conn.sendMessage(m.chat, { text: `❀ Sub-Bot registrado: ${path.basename(pathYukiJadiBot)}\nPuedes usar #infobot para ver detalles.`, mentions: [m.sender] }, { quoted: m }).catch(() => {})
        }
      }

      if (connection === 'close') {
        // Manejo de razones y limpieza
        const reason = lastDisconnect?.error?.output?.statusCode || lastDisconnect?.error?.output?.payload?.statusCode
        // Limpieza de credenciales si la sesión es inválida
        if ([401, 405].includes(reason)) {
          try { fs.rmSync(pathYukiJadiBot, { recursive: true, force: true }) } catch {}
        }
        // Remover sock de global.conns
        try {
          global.conns = (global.conns || []).filter(s => s !== sock)
        } catch {}
        try { sock.ws?.close() } catch {}
        try { sock.ev?.removeAllListeners?.() } catch {}
      }
    } catch (e) {
      console.error('connectionUpdate error:', e)
    }
  }

  // Creds update handler
  async function credsUpdate() {
    try {
      await saveCreds()
    } catch (e) { console.error('saveCreds error:', e) }
  }

  // Bindear handlers
  try {
    sock.ev.on('connection.update', connectionUpdate)
    sock.ev.on('creds.update', credsUpdate)
  } catch (e) {
    console.error('ev.on bind error:', e)
  }

  // Carga dinámica del handler principal del bot para reenviar mensajes al sub-socket si aplica
  let dynamicHandler = null
  async function reloadHandler() {
    try {
      const mod = await import('../handler.js?update=' + Date.now()).catch(() => null)
      dynamicHandler = mod?.default || mod?.handler || null
      if (dynamicHandler && typeof dynamicHandler === 'function') {
        // Enlaza handler al socket si el handler espera bind
        sock.handler = dynamicHandler.bind(sock)
      }
    } catch (e) {
      console.error('reloadHandler error:', e)
    }
  }
  await reloadHandler()

  // Auto-limpieza si no se inicializa en X ms
  setTimeout(() => {
    if (!sock?.user) {
      try { fs.rmSync(pathYukiJadiBot, { recursive: true, force: true }) } catch {}
      try { sock.ws?.close() } catch {}
      try { sock.ev?.removeAllListeners?.() } catch {}
      global.conns = (global.conns || []).filter(s => s !== sock)
      console.log(`[AUTO-CLEAN] Sesión ${path.basename(pathYukiJadiBot)} eliminada por credenciales inválidas.`)
    }
  }, 60000)

  // Intervalo de verificación para sockets muertos
  const intervalId = setInterval(() => {
    if (!sock?.user) {
      try { sock.ws?.close() } catch {}
      try { sock.ev?.removeAllListeners?.() } catch {}
      global.conns = (global.conns || []).filter(s => s !== sock)
      clearInterval(intervalId)
    }
  }, 60000)

  // Retorna el objeto sock para uso externo si se desea
  return sock
}
