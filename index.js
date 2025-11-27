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
import { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers, jidNormalizedUser } from '@whiskeysockets/baileys'
import { makeWASocket, protoType, serialize } from './lib/simple.js'
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

// Inicializaciones mínimas para plugins (evitan errores si la sincronización falla)
global.roowner = Array.isArray(global.roowner) ? global.roowner : []
global.mods = Array.isArray(global.mods) ? global.mods : []
global.staff = Array.isArray(global.staff) ? global.staff : []
global.chatDefaults = (global.chatDefaults && typeof global.chatDefaults === 'object') ? global.chatDefaults : {}

if (!fs.existsSync("./tmp")) {
  fs.mkdirSync("./tmp")
}

const CONFIG_PATH = path.join(__dirname, 'config.js')
watchFile(CONFIG_PATH, async () => {
  try {
    const fresh = (await import('./config.js?update=' + Date.now())).default
    if (Array.isArray(fresh.prefix)) global.prefixes = [...fresh.prefix]
    if (Array.isArray(fresh.owner)) global.owner = fresh.owner

    const prefStr = Array.isArray(global.prefixes) && global.prefixes.length
      ? global.prefixes.join(' ')
      : '-'

    const ownersStr = Array.isArray(global.owner) && global.owner.length
      ? global.owner.map(o => Array.isArray(o) ? (o[0] || '') : (o || '')).filter(Boolean).join(', ')
      : '-'

    console.log(`
╭─────────────────────────────◉
│ ${chalk.black.bgRedBright.bold('        🔁 CONFIG ACTUALIZADA        ')}
│ 「 🗂 」Archivo: config.js
│ 「 🧩 」Prefijos: ${prefStr}
│ 「 👑 」Owners:   ${ownersStr}
╰─────────────────────────────◉
`)
  } catch (e) {
    console.log('[Config] Error recargando config:', e.message)
  }
})

global.plugins = {}
global.commandIndex = {}

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
    console.log(`
╭─────────────────────────────◉
│ ${chalk.red.bgBlueBright.bold('        🧩 PLUGINS CARGADOS        ')}
│ 「 📦 」Total: ${total}
╰─────────────────────────────◉
`)
  } catch {
    console.log('[Plugins]', Object.keys(global.plugins).length, 'cargados')
  }
}

async function importAndIndexPlugin(fullPath) {
  try {
    const mod = await import(pathToFileURL(fullPath).href + `?update=${Date.now()}`)
    const plug = mod.default || mod
    if (!plug) return

    plug.__file = path.basename(fullPath)

    if (Array.isArray(plug.command))
      plug.command = plug.command.map(c => typeof c === 'string' ? c.toLowerCase() : c)
    else if (typeof plug.command === 'string')
      plug.command = plug.command.toLowerCase()

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
      console.error(`
╭─────────────────────────────◉
│ ${chalk.white.bgRed.bold('        ❌ PLUGIN LOAD ERROR        ')}
│ 「 🧩 」Plugin: ${fname}
│ 「 ⚠️ 」Error:  ${e.message || e}
╰─────────────────────────────◉
`)
    } catch {
      console.error('[PluginLoadError]', path.basename(fullPath), e.message)
    }
  }
}

try {
  await loadDatabase()
  console.log(`
╭─────────────────────────────◉
│ ${chalk.red.bgBlueBright.bold('        📦 BASE DE DATOS        ')}
│ 「 🗃 」Archivo: ${DB_PATH}
╰─────────────────────────────◉
`)
} catch (e) {
  console.log('[DB] Error cargando database:', e.message)
}

// Sincronizar roles dinámicos para plugins (mínimo necesario)
try {
  await syncRolesToGlobals()
  console.log(chalk.green('[Roles] Roles sincronizados'))
} catch (e) {
  console.log('[Roles] Error sincronizando roles:', e?.message || e)
}

await loadPlugins()

let handler
try { ({ handler } = await import('./handler.js')) } catch (e) { console.error('[Handler] Error importando handler:', e.message) }

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
    const banner = `\n╭─────────────────────────────◉\n│ ${chalk.red.bgBlueBright.bold('    ⚙ MÉTODO DE CONEXIÓN BOT    ')}\n│「 🗯 」${chalk.yellow('Selecciona cómo quieres conectarte')}\n│「 📲 」${chalk.yellow.bgRed.bold('1. Escanear Código QR')}\n│「 🔛 」${chalk.red.bgGreenBright.bold('2. Código de Emparejamiento')}\n╰─────────────────────────────◉\n${chalk.magenta('--->')} ${chalk.bold('Elige (1 o 2): ')}`
    ans = await ask(banner)
  } while (!['1','2'].includes(ans))
  return ans === '1' ? 'qr' : 'code'
}

const PROCESS_START_AT = Date.now()

async function startBot() {
  const authDir = path.join(__dirname, config.sessionDirName || config.sessionName || global.sessions || 'sessions')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(authDir)
  const method = await chooseMethod(authDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: state,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    browser: method === 'code' ? Browsers.macOS('Safari') : ['SuperBot','Chrome','1.0.0']
  })

  global.conn = sock

  // Auto-carga de jadibots (igual que antes)
  const rutaJadiBot = path.join(__dirname, `./${global.jadi}`)
  if (!fs.existsSync(rutaJadiBot)) {
    fs.mkdirSync(rutaJadiBot, { recursive: true })
  }
  const readRutaJadiBot = fs.readdirSync(rutaJadiBot)
  if (readRutaJadiBot.length > 0) {
    const creds = 'creds.json'
    for (const gjbts of readRutaJadiBot) {
      const botPath = path.join(rutaJadiBot, gjbts)
      if (fs.existsSync(botPath) && fs.statSync(botPath).isDirectory()) {
        const readBotPath = fs.readdirSync(botPath)
        if (readBotPath.includes(creds)) {
          yukiJadiBot({ pathYukiJadiBot: botPath, m: null, conn: sock, args: '', usedPrefix: '/', command: 'serbot' })
        }
      }
    }
  }

  // Mensajes upsert handler
  sock.__sessionOpenAt = sock.__sessionOpenAt || 0
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
      await handler?.call(sock, filteredUpdate)
    } catch (e) { console.error('[HandlerError]', e?.message || e) }
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
  let codeRegenInterface = null

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
        if (!cleaned) { console.log(chalk.red('[Pairing] Entrada vacía.')); attempts++; continue }
        cleaned = cleaned.replace(/\s+/g,'')
        if (!cleaned.startsWith('+')) cleaned = '+' + cleaned
        const valid = await isValidPhoneNumber(cleaned).catch(()=>false)
        if (valid) { obtained = cleaned.replace(/[^0-9]/g,''); break }
        console.log(chalk.yellow(`[Pairing] Número no válido: ${cleaned}. Intenta de nuevo.`))
        attempts++
      }
      return obtained
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

    // resto del flujo (igual que antes)...
    // (mantén el contenido original de maybeStartPairingFlow tal como lo tenías)
  }

  setTimeout(maybeStartPairingFlow, 2500)

  // =========================
  // Eventos de conexión (registrados sobre sock)
  // =========================
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (connection === 'open') {
      console.log('✅ Bot conectado exitosamente')
      if (typeof sendReconnectionMessage === 'function') {
        await sendReconnectionMessage(sock)
      }

      try {
        sock.__sessionOpenAt = Date.now()
        const rawId = sock?.user?.id || ''
        const userName = sock?.user?.name || sock?.user?.verifiedName || 'Desconocido'
        console.log(chalk.green.bold(`[ 🍉 ]  Conectado a: ${userName}`))

        const jid = rawId
        const num = jid.split(':')[0].replace(/[^0-9]/g, '')

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
        console.log('Conectando....')
        startBot()
      } else {
        console.log('[Sesión cerrada] Borra la carpeta de credenciales y vuelve a vincular.')
      }
    }

    if (method === 'code' && !sock.authState.creds.registered && !pairingRequested) {
      setTimeout(maybeStartPairingFlow, 800)
    }
  })

  // Eventos de grupos (welcome/bye) ya usan sock, se mantienen igual
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
      const normalizedParts = participants.map(p => { try { return jidNormalizedUser(p) } catch { return p } })
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
}

startBot()

// Hot reload y utilidades (mantener igual que antes)
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
