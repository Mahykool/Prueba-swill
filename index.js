// index.js
import { fileURLToPath, pathToFileURL } from 'url'
import path from 'path'
import os from 'os'
import fs from 'fs'
import chalk from 'chalk'
import readline from 'readline'
import qrcode from 'qrcode-terminal'
import libPhoneNumber from 'google-libphonenumber'
import cfonts from 'cfonts'
import pino from 'pino'
import {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  jidNormalizedUser
} from '@whiskeysockets/baileys'
import simple from './lib/simple.js'
import config from './config.js'
import { sendWelcomeOrBye } from './lib/welcome.js'
import { loadDatabase, saveDatabase, DB_PATH } from './lib/db.js'
import { watchFile } from 'fs'
import { yukiJadiBot } from './plugins/sockets-serbot.js'
import { syncRolesToGlobals } from './lib/roles-sync.js'

const phoneUtil = (libPhoneNumber.PhoneNumberUtil || libPhoneNumber.default?.PhoneNumberUtil).getInstance()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

global.prefixes = Array.isArray(config.prefix) ? [...config.prefix] : []
global.owner = Array.isArray(config.owner) ? config.owner : []
global.opts = global.opts && typeof global.opts === 'object' ? global.opts : {}
global.jadi = global.jadi || 'jadibts'
global.roowner = Array.isArray(global.roowner) ? global.roowner : []
global.mods = Array.isArray(global.mods) ? global.mods : []
global.staff = Array.isArray(global.staff) ? global.staff : []
global.chatDefaults = (global.chatDefaults && typeof global.chatDefaults === 'object') ? global.chatDefaults : {}

process.env.JADI_DIR = process.env.JADI_DIR || global.jadi

if (!fs.existsSync('./tmp')) fs.mkdirSync('./tmp', { recursive: true })

const CONFIG_PATH = path.join(__dirname, 'config.js')
watchFile(CONFIG_PATH, async () => {
  try {
    const fresh = (await import('./config.js?update=' + Date.now())).default
    if (Array.isArray(fresh.prefix)) global.prefixes = [...fresh.prefix]
    if (Array.isArray(fresh.owner)) global.owner = fresh.owner
    const prefStr = Array.isArray(global.prefixes) && global.prefixes.length ? global.prefixes.join(' ') : '-'
    const ownersStr = Array.isArray(global.owner) && global.owner.length
      ? global.owner.map(o => Array.isArray(o) ? (o[0] || '') : (o || '')).filter(Boolean).join(', ')
      : '-'
    const cfgInfo = `\n╭─────────────────────────────◉\n│ ${chalk.black.bgRedBright.bold('        🔁 CONFIG ACTUALIZADA        ')}\n│ 「 🗂 」${chalk.cyan('Archivo: config.js')}\n│ 「 🧩 」${chalk.yellow('Prefijos: ')}${chalk.white(prefStr)}\n│ 「 👑 」${chalk.yellow('Owners:   ')}${chalk.white(ownersStr)}\n╰─────────────────────────────◉\n`
    console.log(cfgInfo)
  } catch (e) {
    console.log('[Config] Error recargando config:', e.message)
  }
})

global.plugins = {}
global.commandIndex = {}

async function importAndIndexPlugin(fullPath) {
  try {
    const mod = await import(pathToFileURL(fullPath).href + `?update=${Date.now()}`)
    const plug = mod.default || mod
    if (!plug) return
    plug.__file = path.basename(fullPath)
    if (Array.isArray(plug.command)) plug.command = plug.command.map(c => typeof c === 'string' ? c.toLowerCase() : c)
    else if (typeof plug.command === 'string') plug.command = plug.command.toLowerCase()
    global.plugins[plug.__file] = plug
    const cmds = []
    if (typeof plug.command === 'string') cmds.push(plug.command)
    else if (Array.isArray(plug.command)) cmds.push(...plug.command.filter(c => typeof c === 'string'))
    for (const c of cmds) {
      const key = c.toLowerCase()
      if (!global.commandIndex[key]) global.commandIndex[key] = plug
    }
  } catch (e) {
    try {
      const fname = path.basename(fullPath)
      const errBox = `\n╭─────────────────────────────◉\n│ ${chalk.white.bgRed.bold('        ❌ PLUGIN LOAD ERROR        ')}\n│ 「 🧩 」${chalk.yellow('Plugin: ')}${chalk.white(fname)}\n│ 「 ⚠️ 」${chalk.yellow('Error:  ')}${chalk.white(e.message || e)}\n╰─────────────────────────────◉\n`
      console.error(errBox)
    } catch {
      console.error('[PluginLoadError]', path.basename(fullPath), e.message)
    }
  }
}

async function loadPlugins() {
  global.plugins = {}
  global.commandIndex = {}
  const PLUGIN_PATH = path.join(__dirname, 'plugins')
  if (!fs.existsSync(PLUGIN_PATH)) {
    console.log('[Plugins] Carpeta no encontrada:', PLUGIN_PATH)
    return
  }
  const entries = fs.readdirSync(PLUGIN_PATH)
  for (const entry of entries) {
    const entryPath = path.join(PLUGIN_PATH, entry)
    if (fs.statSync(entryPath).isDirectory()) {
      const files = fs.readdirSync(entryPath).filter(f => f.endsWith('.js'))
      for (const file of files) {
        const full = path.join(entryPath, file)
        await importAndIndexPlugin(full)
      }
    } else if (entry.endsWith('.js')) {
      await importAndIndexPlugin(entryPath)
    }
  }
  try {
    const total = Object.keys(global.plugins).length
    const plugInfo = `\n╭─────────────────────────────◉\n│ ${chalk.red.bgBlueBright.bold('        🧩 PLUGINS CARGADOS        ')}\n│ 「 📦 」${chalk.yellow('Total: ')}${chalk.white(total)}\n╰─────────────────────────────◉\n`
    console.log(plugInfo)
  } catch {
    console.log('[Plugins]', Object.keys(global.plugins).length, 'cargados')
  }
}

try { await loadDatabase() } catch (e) { console.log('[DB] Error cargando database:', e.message) }
try {
  const dbInfo = `\n╭─────────────────────────────◉\n│ ${chalk.red.bgBlueBright.bold('        📦 BASE DE DATOS        ')}\n│ 「 🗃 」${chalk.yellow('Archivo: ')}${chalk.white(DB_PATH)}\n╰─────────────────────────────◉\n`
  console.log(dbInfo)
} catch {}

try {
  await syncRolesToGlobals()
  console.log(chalk.green('[Roles] Roles sincronizados'))
} catch (e) {
  console.log('[Roles] Error sincronizando roles:', e?.message || e)
}

await loadPlugins()

let handler
try {
  const mod = await import('./handler.js?update=' + Date.now()).catch(() => null)
  handler = mod?.handler || mod?.default?.handler || mod?.default || mod
  if (!handler) {
    console.warn('[Handler] handler export no encontrado, usando stub')
    handler = async () => {}
  }
} catch (e) {
  console.error('[Handler] Error importando handler:', e.message)
  handler = async () => {}
}

try {
  const { say } = cfonts
  const botDisplayName = (config && (config.botName || config.name || global.namebot)) || 'Bot'
  console.log(chalk.magentaBright(`\n💫 Iniciando ${botDisplayName}...`))
  say('Itsuki-Nakano', { font: 'simple', align: 'left', gradient: ['green','white'] })
  say('By Leo xzzsy👑⚡️', { font: 'console', align: 'center', colors: ['cyan','magenta','yellow'] })
} catch (e) {
  console.log('[Banner] Error al mostrar banners:', e.message)
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(res => rl.question(question, ans => { rl.close(); res(ans) }))
}

async function chooseMethod(authDir) {
  const credsPath = path.join(authDir, 'creds.json')
  if (fs.existsSync(credsPath)) return 'existing'
  if (process.argv.includes('--qr')) return 'qr'
  if (process.argv.includes('--code')) return 'code'
  if (process.env.LOGIN_MODE === 'qr') return 'qr'
  if (process.env.LOGIN_MODE === 'code') return 'code'
  let ans
  do {
    console.clear()
    const banner = `\n╭─────────────────────────────◉\n│ ${chalk.red.bgBlueBright.bold('    ⚙ MÉTODO DE CONEXIÓN BOT    ')}\n│「 🗯 」${chalk.yellow('Selecciona cómo quieres conectarte')}\n│「 📲 」${chalk.yellow.bgRed.bold('1. Escanear Código QR')}\n│「 🔛 」${chalk.red.bgGreenBright.bold('2. Código de Emparejamiento')}\n│\n│「 ✨️ 」${chalk.gray('Usa el código si tienes problemas con el QR')}\n│「 🚀 」${chalk.gray('Ideal para la primera configuración')}\n│\n╰─────────────────────────────◉\n${chalk.magenta('--->')} ${chalk.bold('Elige (1 o 2): ')}`
    ans = await ask(banner)
  } while (!['1','2'].includes(ans))
  return ans === '1' ? 'qr' : 'code'
}

let __restarting = false
let __restartTimeout = null
const RESTART_DEBOUNCE_MS = 5000
let lastRestartAt = 0
let restartAttempts = 0
const MAX_RESTART_ATTEMPTS = 6

async function safeRestart(reason = 'manual') {
  const now = Date.now()
  if (now - lastRestartAt < 5000) {
    console.log('[Restart] Ignorando reinicio rápido:', reason)
    return
  }
  lastRestartAt = now

  if (restartAttempts >= MAX_RESTART_ATTEMPTS) {
    console.error('[Restart] Límite de reinicios alcanzado. Salida forzada.')
    process.exit(1)
  }
  restartAttempts++

  try {
    if (__restarting) {
      console.log('[Restart] Reinicio ya en curso, ignorando:', reason)
      return
    }
    __restarting = true
    console.log(`[Restart] Iniciando reinicio seguro por: ${reason}`)
    try { await saveDatabase() } catch (e) { console.error('[Restart] Error guardando DB:', e?.message || e) }
    try {
      if (global.conn && global.conn.ev && typeof global.conn.ev.removeAllListeners === 'function') {
        global.conn.ev.removeAllListeners()
      }
      if (global.conn && typeof global.conn.logout === 'function') {
        try { await global.conn.logout() } catch {}
      }
      if (global.conn && typeof global.conn.close === 'function') {
        try { await global.conn.close() } catch {}
      }
    } catch (e) {
      console.error('[Restart] Error cerrando socket:', e?.message || e)
    }
    await new Promise(r => setTimeout(r, 1000))
    if (__restartTimeout) clearTimeout(__restartTimeout)
    __restartTimeout = setTimeout(() => {
      __restarting = false
      try {
        startBot().catch(err => console.error('[Restart] startBot error:', err?.message || err))
      } catch (e) {
        console.error('[Restart] No se pudo iniciar startBot:', e?.message || e)
      }
    }, RESTART_DEBOUNCE_MS)
  } catch (e) {
    console.error('[Restart] Error en safeRestart:', e?.message || e)
    __restarting = false
  }
}

const PROCESS_START_AT = Date.now()

async function startBot() {
  const authDir = path.join(__dirname, config.sessionDirName || config.sessionName || global.sessions || 'sessions')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  const method = await chooseMethod(authDir)
  console.log('[LoginMode] Método seleccionado:', method)
  const { version } = await fetchLatestBaileysVersion()

  const sock = await simple.makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    browser: method === 'code' ? Browsers.macOS('Safari') : ['SuperBot','Chrome','1.0.0']
  })

  try { simple.serialize?.() } catch {}
  global.conn = sock

  // Bind store if available
  try {
    const store = (await import('./lib/store.js')).default
    if (store && typeof store.bind === 'function') store.bind(sock)
  } catch (e) {
    console.warn('[Store] No se pudo bindear store:', e?.message || e)
  }

  // Ensure jadi sessions folder exists and start any saved sub-bots
  const rutaJadiBot = path.join(__dirname, `./${global.jadi}`)
  if (!fs.existsSync(rutaJadiBot)) fs.mkdirSync(rutaJadiBot, { recursive: true })
  const readRutaJadiBot = fs.readdirSync(rutaJadiBot)
  if (readRutaJadiBot.length > 0) {
    const creds = 'creds.json'
    for (const gjbts of readRutaJadiBot) {
      const botPath = path.join(rutaJadiBot, gjbts)
      if (fs.existsSync(botPath) && fs.statSync(botPath).isDirectory()) {
        const readBotPath = fs.readdirSync(botPath)
        if (readBotPath.includes(creds)) {
          yukiJadiBot({ pathYukiJadiBot: botPath, m: null, conn: sock, args: '', usedPrefix: '/', command: 'serbot' }).catch(() => {})
        }
      }
    }
  }

  sock.__sessionOpenAt = sock.__sessionOpenAt || 0

  async function generatePairingCodeWithRetry(number, maxAttempts = 5) {
    let attempt = 0
    while (attempt < maxAttempts) {
      try {
        await ensureAuthDir()
        return await sock.requestPairingCode(number)
      } catch (err) {
        const status = err?.output?.statusCode || err?.output?.payload?.statusCode
        const transient = status === 428 || err?.code === 'ENOENT' || /Connection Closed/i.test(err?.message || '') || /not open/i.test(err?.message || '')
        if (!transient) throw err
        attempt++
        const wait = 500 + attempt * 500
        console.log(`[Pairing] Aún no listo (intentando de nuevo en ${wait}ms) intento ${attempt}/${maxAttempts}`)
        await new Promise(r => setTimeout(r, wait))
      }
    }
    throw new Error('No se pudo obtener el código tras reintentos')
  }

  let pairingRequested = false
  let pairingCodeGenerated = false

  async function maybeStartPairingFlow() {
    if (method !== 'code') return
    if (sock.authState.creds.registered) return
    if (pairingRequested) return
    pairingRequested = true

    async function promptForNumber(initialMsg) {
      let attempts = 0
      let obtained = ''
      while (attempts < 5 && !obtained) {
        const raw = await ask(initialMsg)
        let cleaned = String(raw || '').trim()
        if (!cleaned) { attempts++; continue }
        cleaned = cleaned.replace(/\s+/g,'')
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned
        const valid = await isValidPhoneNumber(cleaned).catch(()=>false)
        if (valid) { obtained = cleaned.replace(/[^0-9]/g,''); break }
        attempts++
      }
      return obtained
    }

    try {
      const number = await promptForNumber(chalk.yellow('👉 Ingresa el número de WhatsApp donde quieres vincular el bot (ej: +5219991234567): '))
      if (!number) { pairingRequested = false; return }
      await persistBotNumberIfNeeded(number)
      const pairingCode = await generatePairingCodeWithRetry(number)
      pairingCodeGenerated = true
      console.log(chalk.green.bold('\n🔑 CÓDIGO DE EMPAREJAMIENTO GENERADO:\n') + chalk.white.bold(`\n   ${pairingCode}\n`))
    } catch (err) {
      pairingRequested = false
      console.error('[Pairing] Error durante el flujo de emparejamiento:', err?.message || err)
    }
  }

  setTimeout(maybeStartPairingFlow, 2500)

  sock.ev.on('connection.update', async (update) => {
    try {
      const logUpdate = { ...update }
      if (method === 'code' && logUpdate.qr) delete logUpdate.qr
      console.log('[ConnUpdate] update:', JSON.stringify(logUpdate, null, 2))
      const { connection, lastDisconnect, qr, output } = update
      if (output) console.log('[ConnUpdate] output:', JSON.stringify(output, null, 2))
      if (output?.statusCode === 515 || (output && output.message && /Stream Errored/i.test(String(output.message)))) {
        console.error('[ConnUpdate] Stream Errored detectado. Forzando reinicio seguro.')
        await safeRestart('stream:error 515')
        return
      }
      if (connection === 'open') {
        console.log('✅ Bot conectado exitosamente')
        restartAttempts = 0
        try {
          sock.__sessionOpenAt = Date.now()
          const rawId = sock?.user?.id || ''
          const userName = sock?.user?.name || sock?.user?.verifiedName || 'Desconocido'
          console.log(chalk.green.bold(`[ 🍉 ]  Conectado a: ${userName}`))
          const jid = rawId
          const num = jid.split(':')[0].replace(/[^0-9]/g,'')
          if (num && !config.botNumber && !global.botNumber) {
            try {
              const cfgPath = path.join(__dirname, 'config.js')
              const file = await fs.promises.readFile(cfgPath, 'utf8')
              let updated = file
              const emptyAssign = /global\.botNumber\s*=\s*(?:global\.botNumber\s*\|\|\s*)?['"]\s*['"]\s*;?/m
              if (emptyAssign.test(updated)) {
                updated = updated.replace(emptyAssign, `global.botNumber = '${num}'`)
              } else if (/botNumber\s*:\s*''/m.test(updated)) {
                updated = updated.replace(/botNumber\s*:\s*''/m, `botNumber: '${num}'`)
              }
              if (updated !== file) {
                await fs.promises.writeFile(cfgPath, updated)
                if (config) config.botNumber = num
                global.botNumber = num
                console.log(chalk.gray('[Config] botNumber autocompletado en config.js'))
              }
            } catch (e) {
              console.log(chalk.red('[Config] Error guardando botNumber auto:', e.message))
            }
          }
        } catch (e) {
          console.log(chalk.red('[Open] Error en post-conexión:', e.message))
        }
      }

      if (qr && method === 'qr') {
        console.clear()
        console.log(chalk.cyan('Escanea este QR con WhatsApp (Dispositivos vinculados):'))
        try { qrcode.generate(qr, { small: true }) } catch { console.log(qr) }
        console.log(chalk.gray('Para usar código de emparejamiento: reinicia con --code'))
      }

      if (connection === 'close') {
        console.log('❌ Conexión cerrada:', lastDisconnect?.error)
        const statusCode = lastDisconnect?.error?.output?.statusCode
        if (statusCode !== DisconnectReason.loggedOut) {
          console.log('[ConnUpdate] Reiniciando startBot por cierre no logout')
          await safeRestart('connection.close')
        } else {
          console.log('[ConnUpdate] Sesión cerrada por logout. Borra credenciales y vuelve a vincular manualmente.')
        }
      }

      if (method === 'code' && !sock.authState.creds.registered && !pairingRequested) {
        setTimeout(maybeStartPairingFlow, 800)
      }
    } catch (e) {
      console.error('[ConnUpdate] Error manejando connection.update:', e?.message || e)
    }
  })

  sock.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const since = sock.__sessionOpenAt || PROCESS_START_AT
      const graceMs = 5000
      const msgs = Array.isArray(chatUpdate?.messages) ? chatUpdate.messages : []
      const fresh = msgs.filter((m) => {
        try {
          const tsSec = Number(m?.messageTimestamp || 0)
          const tsMs = isNaN(tsSec) ? 0 : (tsSec > 1e12 ? tsSec : tsSec * 1000)
          if (!tsMs) return true
          return tsMs >= (since - graceMs)
        } catch { return true }
      })
      if (!fresh.length) return
      const filteredUpdate = { ...chatUpdate, messages: fresh }

      if (!handler) {
        console.error('[Handler] handler no definido')
        return
      }

      try {
        await handler.call(sock, filteredUpdate)
      } catch (err) {
        console.error('[HandlerError] Error en handler:', err?.message || err)
        console.error(err?.stack || err)
        if (/stream errored|handshake|noise/i.test(String(err?.message || ''))) {
          console.error('[HandlerError] Error crítico relacionado con stream/handshake. Reiniciando.')
          await safeRestart('handler critical')
        }
      }
    } catch (e) {
      console.error('[MessagesUpsert] Error externo:', e?.message || e)
    }
  })

  sock.ev.on('creds.update', saveCreds)

  try {
    setInterval(() => { saveDatabase().catch(() => {}) }, 60000)
    const shutdown = async () => { try { await saveDatabase() } catch {} process.exit(0) }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch {}

  async function ensureAuthDir() {
    try { if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true }) } catch (e) { console.error('[AuthDir]', e.message) }
  }

  sock.ev.on('group-participants.update', async (ev) => {
    try {
      const { id, participants, action } = ev || {}
      if (!id || !participants || !participants.length) return
      const db = global.db?.data
      const chatCfg = db?.chats?.[id] || { welcome: true }
      if (!chatCfg.welcome) return
      const type = action === 'add' ? 'welcome' : (action === 'remove' ? 'bye' : null)
      if (!type) return
      const botIdRaw = sock?.user?.id || ''
      const botId = botIdRaw ? jidNormalizedUser(botIdRaw) : ''
      const normalizedParts = participants.map(p => {
        try { return jidNormalizedUser(p) } catch { return p }
      })
      if (type === 'bye' && botId && normalizedParts.includes(botId)) return
      let meta = null
      if (typeof sock.groupMetadata === 'function') {
        try { meta = await sock.groupMetadata(id) } catch { meta = null }
      }
      const groupName = meta?.subject || ''
      for (const p of participants) {
        try {
          let userName = 'Miembro'
          try { userName = await Promise.resolve(sock.getName?.(p) ?? 'Miembro') } catch { userName = 'Miembro' }
          const botIdJoin = botIdRaw ? jidNormalizedUser(botIdRaw) : ''
          if (type === 'welcome' && botIdJoin && jidNormalizedUser(p) === botIdJoin) {
            try {
              const cfgDefaults = (global.chatDefaults && typeof global.chatDefaults === 'object') ? global.chatDefaults : {}
              global.db = global.db || { data: { users: {}, chats: {}, settings: {}, stats: {} } }
              global.db.data = global.db.data || { users: {}, chats: {}, settings: {}, stats: {} }
              global.db.data.chats = global.db.data.chats || {}
              global.db.data.chats[id] = global.db.data.chats[id] || {}
              for (const [k,v] of Object.entries(cfgDefaults)) {
                if (!(k in global.db.data.chats[id])) global.db.data.chats[id][k] = v
              }
              if (!('bienvenida' in global.db.data.chats[id]) && ('welcome' in cfgDefaults)) global.db.data.chats[id].bienvenida = !!cfgDefaults.welcome
            } catch {}
          }
          await sendWelcomeOrBye(sock, { jid: id, userName, groupName, type: type === 'bye' ? 'bye' : 'welcome', participant: p })
        } catch (e) {
          const code = e?.data || e?.output?.statusCode || e?.output?.payload?.statusCode
          if (code === 403) continue
          console.error('[WelcomeEvent]', e)
        }
      }
    } catch (e) { console.error('[WelcomeEvent]', e) }
  })

  const PLUGIN_DIR = path.join(__dirname, 'plugins')
  let __syntaxErrorFn = null
  try { const mod = await import('syntax-error'); __syntaxErrorFn = mod.default || mod } catch {}
  global.reload = async (_ev, filename) => {
    try {
      if (!filename || !filename.endsWith('.js')) return
      const filePath = path.join(PLUGIN_DIR, filename)
      if (!fs.existsSync(filePath)) {
        console.log(chalk.yellow(`⚠️ El plugin '${filename}' fue eliminado`))
        delete global.plugins[filename]
        return
      }
      if (__syntaxErrorFn) {
        try {
          const src = await fs.promises.readFile(filePath)
          const err = __syntaxErrorFn(src, filename, { sourceType: 'module', allowAwaitOutsideFunction: true })
          if (err) {
            console.log([
              `❌ Error en plugin: '${filename}'`,
              `🧠 Mensaje: ${err.message}`,
              `📍 Línea: ${err.line}, Columna: ${err.column}`,
              `🔎 ${err.annotated}`
            ].join('\n'))
            return
          }
        } catch {}
      }
      await importAndIndexPlugin(filePath)
      console.log(chalk.green(`🍃 Recargado plugin '${filename}'`))
    } catch (e) {
      console.error('[ReloadPlugin]', e.message || e)
    }
  }
  try {
    fs.watch(PLUGIN_DIR, { recursive: false }, (ev, fname) => {
      if (!fname) return
      global.reload(ev, fname).catch(() => {})
    })
  } catch {}

  async function isValidPhoneNumber(number) {
    try {
      let n = number.replace(/\s+/g, '')
      if (n.startsWith('+521')) {
        n = n.replace('+521', '+52')
      } else if (n.startsWith('+52') && n[4] === '1') {
        n = n.replace('+52 1', '+52')
        n = n.replace('+521', '+52')
      }
      const parsed = phoneUtil.parseAndKeepRawInput(n)
      return phoneUtil.isValidNumber(parsed)
    } catch (error) {
      return false
    }
  }

  async function persistBotNumberIfNeeded(num) {
    try {
      if (!num) return
      const cfgPath = path.join(__dirname, 'config.js')
      const file = await fs.promises.readFile(cfgPath, 'utf8')
      let updated = file
      const patterns = [
        { re: /global\.botNumber\s*=\s*global\.botNumber\s*\|\|\s*['"].*?['"]\s*;?/m, repl: `global.botNumber = '${num}'` },
        { re: /global\.botNumber\s*=\s*['"].*?['"]\s*;?/m, repl: `global.botNumber = '${num}'` },
        { re: /botNumber\s*:\s*['"].*?['"]/m, repl: `botNumber: '${num}'` }
      ]
      for (const { re, repl } of patterns) {
        if (re.test(updated)) { updated = updated.replace(re, repl); break }
      }
      if (updated !== file) {
        await fs.promises.writeFile(cfgPath, updated)
        if (config) config.botNumber = num
        global.botNumber = num
        console.log(chalk.gray('[Config] botNumber guardado en config.js'))
      }
    } catch (e) {
      console.log(chalk.red('[Config] No se pudo actualizar botNumber:', e.message))
    }
  }

}

startBot().catch(err => {
  console.error('[StartBot] Error al iniciar:', err?.message || err)
  process.exit(1)
})
