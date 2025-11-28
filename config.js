import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath, pathToFileURL } from 'url'
import fs from 'fs'
import * as cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'
import { dirname } from 'path'

global.__dirname = (url) => dirname(fileURLToPath(url));

// =======================
// Configuraciones principales
// =======================

// Dueño raíz (máxima autoridad)
global.roowner = ['56969066865@s.whatsapp.net']

// Lista de co-dueños
global.owner = [
  ['56969066865@s.whatsapp.net', 'Mahykol 👑 Creador', true],
  ['569XXXXXXXX@s.whatsapp.net', 'Co-Dueño', true]
]

// Moderadores
global.mods = [
  '56961199174@s.whatsapp.net'
]

// Suittag y prems
global.suittag = [
  '56961199174@s.whatsapp.net'
]
global.prems = [
  '56961199174@s.whatsapp.net'
]

global.botNumber = '56900000000'

// Información del bot
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
global.apikey = 'SwillIA-Key'

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

// APIs
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
  'https://api.xteam.xyz': 'YOUR_XTEAM_KEY',
  'https://api.lolhuman.xyz': 'API_KEY',
  'https://api.betabotz.eu.org': 'API_KEY',
  'https://mayapi.ooguy.com': 'may-f53d1d49',
  'https://api.swill.com': ''
}

// Endpoints IA
global.SIPUTZX_AI = {
  base: global.APIs?.siputzx || 'https://api.siputzx.my.id',
  bardPath: '/api/ai/bard',
  queryParam: 'query',
  headers: { accept: '*/*' }
}

// =======================
// Sistema de permisos
// =======================
global.permissions = {
  administrativos: [
    'gestionar_roles',       // add-mod, remove-mod, list-mods
    'moderacion_avanzada',   // kick, ban
    'configuracion_global',
    'gestionar_plugins',
    'ver_logs',
    'reiniciar_bot'
  ],
  comunes: [
    'ver_ayuda',
    'usar_stickers',
    'utilidades',
    'multimedia',
    'interacciones'
  ]
}

// Defaults de chat
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

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  try { import(pathToFileURL(file).href + `?update=${Date.now()}`) } catch {}
})

// Export final
export default {
  prefix: global.prefix,
  owner: global.owner,
  sessionDirName: global.sessions,
  sessionName: global.sessions,
  botNumber: global.botNumber,
  chatDefaults: global.chatDefaults,
  permissions: global.permissions
}
