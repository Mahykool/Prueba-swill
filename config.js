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

// Dueño raíz (máxima autoridad) — usar solo números sin @s.whatsapp.net
global.roowner = ['56969066865'] // agrega aquí los números que pueden dar/quitar mods

// Lista de co-dueños (solo uno más aparte de ti)
// Formato: [ ['56912345678', 'Nombre', true], ... ]
global.owner = [
  ['56969066865', 'Mahykol 👑 Creador', true],   // Tu número y título especial
  ['569XXXXXXXX', 'Co-Dueño', true]             // Reemplaza XXXXXXXX por el número real (sin @)
]

// Moderadores (admin virtuales: pueden banear/kickear)
import path from 'path'

const modsPath = path.join(process.cwd(), 'src', 'database', 'mods.json')
// Normalizador: convierte cualquier entrada a 569XXXXXXXX@s.whatsapp.net
const normalize = n => String(n || '').replace(/@s\.whatsapp\.net/g, '').replace(/\D/g, '') + '@s.whatsapp.net'

try {
  const raw = require(modsPath)
  global.mods = Array.isArray(raw) ? raw.map(normalize) : []
} catch (e) {
  global.mods = []
}

// Suittag y prems (privilegios secundarios)
global.suittag = [
  '56961199174@s.whatsapp.net'
]
global.prems = [
  '56961199174@s.whatsapp.net'
]

global.botNumber = '56900000000' // ← Cambiar este número según el que conecte el bot

// Información del bot 
global.libreria = 'Baileys'
global.baileys = 'V 6.7.9'
global.languaje = 'Español'
global.vs = '1.0.0'              // versión inicial de Swill
global.vsJB = '1.0'              // versión secundaria si usas variantes
global.nameqr = 'SwillQR'        // nombre del archivo QR
global.namebot = 'Swill-IA'      // nombre oficial del bot
global.sessions = 'Swill-sessions' // carpeta de sesiones
global.jadi = 'jadibts'
global.SwillJadibts = true       // activación de multi-sesión
global.Choso = true
global.prefix = ['.', '!', '/', '#', '%']
global.apikey = 'SwillIA-Key'    // clave principal para APIs

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

// Enlaces oficiales de Swill
global.comunidad1 = 'https://chat.whatsapp.com/K02sv6Fm87fBQvlNKIGOQB'   // Comunidad principal
global.gp1 = 'https://chat.whatsapp.com/C01CZDKL88uEFRZqlLxOdg?mode=wwt' // Grupo general principal

// Espacios reservados (inactivos por ahora)
global.comunidad2 = ''   // Comunidad secundaria (pendiente)
global.comunidad3 = ''   // Otra comunidad futura
global.gp2 = ''          // Grupo secundario
global.gp3 = ''          // Otro grupo futuro
global.channel = ''      // Canal oficial (pendiente)
global.channel2 = ''     // Canal secundario (pendiente)
global.md = ''           // Repositorio GitHub (pendiente)
global.correo = ''       // Correo de contacto (pendiente)

// Apis para las descargas y más

// APIs oficiales de Swill
global.APIs = {
  ryzen: 'https://api.ryzendesu.vip',
  xteam: 'https://api.xteam.xyz',
  lol: 'https://api.lolhuman.xyz',
  delirius: 'https://delirius-apiofc.vercel.app',
  siputzx: 'https://api.siputzx.my.id',
  mayapi: 'https://mayapi.ooguy.com',
  swillapi: '' // espacio reservado para tu propia API futura
}

global.APIKeys = {
  'https://api.xteam.xyz': 'YOUR_XTEAM_KEY',
  'https://api.lolhuman.xyz': 'API_KEY',
  'https://api.betabotz.eu.org': 'API_KEY',
  'https://mayapi.ooguy.com': 'may-f53d1d49',
  'https://api.swill.com': '' // clave reservada para tu API futura
}

// Endpoints de IA
global.SIPUTZX_AI = {
  base: global.APIs?.siputzx || 'https://api.siputzx.my.id',
  bardPath: '/api/ai/bard',
  queryParam: 'query',
  headers: { accept: '*/*' }
}

global.chatDefaults = {
  isBanned: false,       // Si el chat está baneado
  sAutoresponder: '',    // Texto de autorespuesta personalizada
  welcome: true,         // Mensajes de bienvenida activos
  autolevelup: false,    // Subida automática de nivel (XP)
  autoAceptar: false,    // Auto-aceptar solicitudes
  autosticker: false,    // Convierte imágenes en stickers automáticamente
  autoRechazar: false,   // Auto-rechazar solicitudes
  autoresponder: false,  // Respuestas automáticas
  detect: true,          // Detecta entradas/salidas de usuarios
  antiBot: false,        // Bloquea otros bots
  antiBot2: false,       // Bloqueo alternativo de bots
  modoadmin: false,      // Solo admins pueden usar comandos
  antiLink: true,        // Bloquea links externos
  antiImg: false,        // Bloquea imágenes
  reaction: false,       // Reacciones automáticas
  nsfw: false,           // Contenido adulto (apagado por defecto)
  antifake: false,       // Bloquea números falsos
  delete: false,         // Borra mensajes prohibidos
  expired: 0,            // Tiempo de expiración de configuración
  antiLag: false,        // Prevención de lag
  per: [],               // Lista de permisos especiales
  antitoxic: false       // Filtro de mensajes ofensivos
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Update 'config.js'"))
  try { import(pathToFileURL(file).href + `?update=${Date.now()}`) } catch {}
})

// Configuraciones finales
export default {
  prefix: global.prefix,
  owner: global.owner,
  sessionDirName: global.sessions,
  sessionName: global.sessions,
  botNumber: global.botNumber,
  chatDefaults: global.chatDefaults
}
