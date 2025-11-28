// lib/db.js
import { Low } from 'lowdb'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const file = join(__dirname, '..', 'database.json')

export const DB_PATH = file

// ⭐ SimpleAdapter para Low (lee/escribe JSON)
class SimpleAdapter {
  constructor(filePath) {
    this.filePath = filePath
  }

  async read() {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8')
      return JSON.parse(data)
    } catch (e) {
      if (e.code === 'ENOENT') return null
      // Si JSON corrupto, loguea y devuelve null para re-inicializar
      console.error('[DB] read error:', e?.message || e)
      return null
    }
  }

  async write(data) {
    // Asegura directorio antes de escribir
    const dir = dirname(this.filePath)
    if (!existsSync(dir)) {
      try { mkdirSync(dir, { recursive: true }) } catch (err) { /* noop */ }
    }
    // Escritura atómica simple: escribir en temp y renombrar
    const tmp = `${this.filePath}.tmp`
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8')
    await fs.rename(tmp, this.filePath)
  }
}

const adapter = new SimpleAdapter(file)
export const db = new Low(adapter, { users: {}, chats: {}, stats: {}, settings: {} })

// Cola simple para serializar escrituras y evitar race conditions
let writeQueue = Promise.resolve()
function enqueueWrite(fn) {
  writeQueue = writeQueue.then(() => fn()).catch((e) => { console.error('[DB] queue error:', e) })
  return writeQueue
}

export async function loadDatabase() {
  try {
    // Asegura directorio y archivo base
    const dir = dirname(DB_PATH)
    if (!existsSync(dir)) {
      try { mkdirSync(dir, { recursive: true }) } catch {}
    }
    // Lee DB
    await db.read()
    db.data ||= { users: {}, chats: {}, stats: {}, settings: {} }

    // Sincroniza con global.db para compatibilidad
    if (!global.db) global.db = db
    if (!global.db.data) global.db.data = db.data

    // Exponer helpers globales (opcional)
    global.loadDatabase = loadDatabase
    global.saveDatabase = saveDatabase

    return db.data
  } catch (e) {
    console.error('[DB] loadDatabase error:', e?.message || e)
    // Garantiza estructura mínima en caso de fallo
    db.data = db.data || { users: {}, chats: {}, stats: {}, settings: {} }
    if (!global.db) global.db = db
    global.db.data = db.data
    return db.data
  }
}

export async function saveDatabase() {
  try {
    // Sincroniza datos desde global si existe
    if (global.db && global.db.data) db.data = global.db.data

    // Encola la escritura para que sea serial
    await enqueueWrite(async () => {
      try {
        await db.write()
      } catch (e) {
        console.error('[DB] write error:', e?.message || e)
        throw e
      }
    })
    return true
  } catch (e) {
    console.error('[DB] saveDatabase error:', e?.message || e)
    return false
  }
}

export default { db, DB_PATH, loadDatabase, saveDatabase }
