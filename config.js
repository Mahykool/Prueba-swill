// config.js (implementado completo)
import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import fs from 'fs'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'
import { dirname, resolve } from 'path'

/**
 * Configuración centralizada y segura
 * - Normaliza números
 * - Usa variables de entorno para claves sensibles
 * - Import seguro de lib-roles con pathToFileURL
 * - Shim de compatibilidad para global.* (no rompe si falla)
 */

// __dirname normalizado
global.__dirname = dirname(fileURLToPath(import.meta.url))

// Helper de normalización de números (sin caracteres)
const normalizeNum = n => String(n || '').replace(/\D/g, '')

// Helper global para convertir a JID completo
global.toJid = (jidOrNum) => {
  if (!jidOrNum) return null
  jidOrNum = String(jidOrNum)
  if (jidOrNum.endsWith('@s.whatsapp.net') || jidOrNum.endsWith('@g.us')) return jidOrNum
  const only = jidOrNum.replace(/\D/g, '')
  return only ? `${only}@s.whatsapp.net` : null
}

// Valores semilla (puedes mantenerlos aquí como fallback)
// Usar solo números sin @s.whatsapp.net
global._seeds = {
  roowner: ['56969066865'],
  owner: [
    ['56969066865', 'Mahykol 👑 Creador', true],
    ['569XXXXXXXX', 'Co-Dueño', true]
  ]
}

// Normalizar seeds al arrancar (mantener formato numérico para compatibilidad interna)
global.roowner = (global._seeds.roowner || []).map(normalizeNum)
global.owner = (global._seeds.owner || []).map(o => [normalizeNum(o[0]), o[1] || '', !!o[2]])

// Variables derivadas con JIDs completos para comparaciones
global.roownerJids = (global.roowner || []).map(n => `${n}@s.whatsapp.net`)
global.ownerJids = (global.owner || []).map(o => `${o[0]}@s.whatsapp.net`)
global.ownerNames = (global.owner || []).map(o => o[1] || null)

// Configs básicas del bot
global.botNumber = normalizeNum('56900000000') // cambiar por el número real
global.libreria = 'Baileys'
global.baileys = 'V 6.7.9'
global.languaje = 'Español'
global.vs = '1.0.0'
global.vsJB = '1.0'
global.nameqr = 'SwillQR'
global.namebot = 'Swill-IA'
global.sessions = 'Swill-sessions'
global.jadi = 'jadibts'
global.SwillJadibts = true
global.Choso = true
global.prefix = ['.', '!', '/', '#', '%']
global.apikey = process.env.SWILL_API_KEY || 'SwillIA-Key'

// Branding y créditos
global.packname = 'Swill Stickers 🌙'
global.botname = '🤖 Swill IA Bot'
global.wm = '© Mahykol'
global.wm3 = '⫹⫺ 𝙈𝙪𝙡𝙩𝙞-𝘿𝙚𝙫𝙞𝙘𝙚 💻'
global.author = '👑 Creado por Mahykol'
global.dev = '© Configurado por Mahykol'
global.textbot = 'Swill v1'
global.etiqueta = '@Mahykol'
global.gt = '© Swill Bot | The Best WhatsApp IA 🤖'
global.me = '🌙 Swill IA Update'
global.listo = '*Aquí tienes*'

// Economía y límites
global.moneda = 'SwillCoins'
global.multiplier = 69
global.maxwarn = 3

// Librerías expuestas (si las necesitas globalmente)
global.cheerio = cheerio
global.fs = fs
global.fetch = fetch
global.axios = axios
global.moment = moment

// Enlaces oficiales
global.comunidad1 = 'https://chat.whatsapp.com/K02sv6Fm87fBQvlNKIGOQB'
global.gp1 = 'https://chat.whatsapp.com/C01CZDKL88uEFRZqlLxOdg?mode=wwt'
global.comunidad2 = ''
global.comunidad3 = ''
global.gp2 = ''
global.gp3 = ''
global.channel = ''
global.channel2 = ''
global.md = ''
global.correo = ''

// APIs y claves (usar variables de entorno en producción)
global.APIs = {
  ryzen: 'https://api.ryzendesu.vip',
  xteam: 'https://api.xteam.xyz',
  lol: 'https://api.lolhuman.xyz',
  delirius: 'https://delirius-apiofc.vercel.app',
  siputzx: 'https://api.siputzx.my.id',
  mayapi: 'https://mayapi.ooguy.com',
  swillapi: ''
}

global.APIKeys = {
  'https://api.xteam.xyz': process.env.XTEAM_KEY || 'YOUR_XTEAM_KEY',
  'https://api.lolhuman.xyz': process.env.LOLHUMAN_KEY || 'API_KEY',
  'https://api.betabotz.eu.org': process.env.BETABOTZ_KEY || 'API_KEY',
  'https://mayapi.ooguy.com': process.env.MAYAPI_KEY || 'may-f53d1d49',
  'https://api.swill.com': process.env.SWILLAPI_KEY || ''
}

// Endpoints IA
global.SIPUTZX_AI = {
  base: global.APIs?.siputzx || 'https://api.siputzx.my.id',
  bardPath: '/api/ai/bard',
  queryParam: 'query',
  headers: { accept: '*/*' }
}

// Chat defaults
global.chatDefaults = {
  isBanned: false,
  sAutoresponder: '',
  welcome: true,
  autolevelup: false,
  autoAceptar: false,
  autosticker: false,
  autoRechazar: false,
  autoresponder: false,
  detect: true,
  antiBot: false,
  antiBot2: false,
  modoadmin: false,
  antiLink: true,
  antiImg: false,
  reaction: false,
  nsfw: false,
  antifake: false,
  delete: false,
  expired: 0,
  antiLag: false,
  per: [],
  antitoxic: false
}

// -----------------------------
// Shim de compatibilidad (sincroniza global.* desde lib-roles)
// -----------------------------
;(async () => {
  try {
    // Import seguro de lib-roles (ajusta la ruta si tu estructura es distinta)
    const rolesUrl = pathToFileURL(new URL('./lib/lib-roles.js', import.meta.url).pathname).href
    const rolesLib = await import(rolesUrl)
    const { listRole } = rolesLib

    const mods = listRole('mods') || []
    const suittag = listRole('suittag') || []
    const prems = listRole('prems') || []
    const roowners = listRole('roowner') || []
    const owners = listRole('owners') || []

    // Asignaciones seguras y normalizadas
    // Aseguramos que global.mods contenga JIDs completos
    global.mods = Array.isArray(mods)
      ? mods.map(m => {
          const s = String(m)
          return s.endsWith('@s.whatsapp.net') ? s : `${s.replace(/\D/g, '')}@s.whatsapp.net`
        }).filter(Boolean)
      : []

    global.suittag = Array.isArray(suittag) ? suittag.map(s => String(s)) : []
    global.prems = Array.isArray(prems) ? prems.map(p => String(p)) : []

    // Si roles.json tiene valores, sincronizamos seeds (normalizando números)
    if (Array.isArray(roowners) && roowners.length) {
      global.roowner = roowners.map(r => String(r).replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, ''))
      global.roownerJids = global.roowner.map(n => `${n}@s.whatsapp.net`)
    }
    if (Array.isArray(owners) && owners.length) {
      global.owner = owners.map(o =>
        Array.isArray(o)
          ? [String(o[0]).replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, ''), o[1] || '', !!o[2]]
          : [String(o).replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, ''), '', false]
      )
      global.ownerJids = global.owner.map(o => `${o[0]}@s.whatsapp.net`)
      global.ownerNames = global.owner.map(o => o[1] || null)
    }

    console.log('Roles shim loaded: mods=', global.mods, 'ownerJids=', global.ownerJids, 'roownerJids=', global.roownerJids)
  } catch (e) {
    // No interrumpe el arranque; los plugins nuevos usan lib-roles directamente
    console.error('Roles shim sync failed:', e && e.stack ? e.stack : e)
  }
})()

// Hot-reload del archivo de configuración
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  try { import(pathToFileURL(file).href + `?update=${Date.now()}`) } catch (err) { console.error(err) }
})

// Export de configuración (agrupado para reducir polución global)
export default {
  prefix: global.prefix,
  owner: global.owner,
  roowner: global.roowner,
  sessionDirName: global.sessions,
  sessionName: global.sessions,
  botNumber: global.botNumber,
  chatDefaults: global.chatDefaults,
  APIs: global.APIs,
  APIKeys: global.APIKeys
}
