// ✦ Sistema SHOWBAN LATAM ✦ Swill
// Diseñado por Mahykol ✦

import fs from 'fs'

const FILE = './database/muted.json'
const LOGFILE = './database/mutelog.json'

// Crear archivos si no existen
if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify({}), 'utf-8')
if (!fs.existsSync(LOGFILE)) fs.writeFileSync(LOGFILE, JSON.stringify([]), 'utf-8')

// Cargar datos
let muted = JSON.parse(fs.readFileSync(FILE))
let mutelog = JSON.parse(fs.readFileSync(LOGFILE))

// Guardar datos
function saveMuted() {
  fs.writeFileSync(FILE, JSON.stringify(muted, null, 2))
}
function saveLog() {
  fs.writeFileSync(LOGFILE, JSON.stringify(mutelog, null, 2))
}

// Convertir tiempo (1m, 2h, 3d)
function parseTime(str) {
  const regex = /^(\d+)(s|m|h|d)$/i
  const match = str.match(regex)
  if (!match) return null

  const num = parseInt(match[1])
  const unit = match[2].toLowerCase()

  const multipliers = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  }

  return num * multipliers[unit]
}

let handler = async (m, { conn, args, command }) => {

  // ✅ Roles permitidos
  const user = m.sender
  const isRowner = global.roowner?.includes(user)
  const isOwner = global.owner?.some(o => o[0] === user)
  const isMod = global.mods?.includes(user)

  if (!isRowner && !isOwner && !isMod)
    return conn.reply(m.chat, '🛡️ *No tienes permisos para usar este comando.*', m)

  // ✅ Obtener usuario objetivo
  let target
  if (m.quoted) target = m.quoted.sender
  else if (['mutelist', 'mutelog', 'clearmutelog'].includes(command)) target = null
  else return conn.reply(m.chat, '⚠️ *Responde al mensaje del usuario que quieres mutear.*', m)

  // ✅ Protección anti-abuso
  if (target) {
    if (global.roowner?.includes(target)) return conn.reply(m.chat, '❌ No puedes mutear al ROOWNER.', m)
    if (global.owner?.some(o => o[0] === target)) return conn.reply(m.chat, '❌ No puedes mutear a un OWNER.', m)
    if (global.mods?.includes(target)) return conn.reply(m.chat, '❌ No puedes mutear a otro MOD.', m)
    if (target === conn.user.jid) return conn.reply(m.chat, '❌ No puedes mutear al bot.', m)
  }

  // ✅ Comando: showban
  if (command === 'showban') {

    if (!args[0]) return conn.reply(m.chat, '⏳ *Debes indicar un tiempo.*\nEjemplo: showban 10m', m)

    const duration = parseTime(args[0])
    if (!duration) return conn.reply(m.chat, '❌ *Formato inválido.* Usa: 10s, 5m, 2h, 1d', m)

    const reason = args.slice(1).join(' ') || 'Sin razón'
    const silent = args.includes('silent')

    const expires = Date.now() + duration

    muted[target] = { expires, reason, silent }
    saveMuted()

    // ✅ Registrar en log
    mutelog.push({
      action: 'SHOWBAN',
      target,
      by: user,
      time: args[0],
      reason,
      silent,
      date: new Date().toISOString()
    })
    saveLog()

    if (!silent) {
      return conn.reply(
        m.chat,
        `🛡️ *Usuario muteado (SHOWBAN)*\n\n` +
        `👤 Usuario: @${target.split('@')[0]}\n` +
        `⏳ Tiempo: ${args[0]}\n` +
        `📄 Razón: ${reason}\n` +
        `✅ El bot eliminará sus mensajes (excepto stickers).`,
        m,
        { mentions: [target] }
      )
    } else {
      return conn.reply(
        m.chat,
        `🕶️ *Mute silencioso aplicado a:* @${target.split('@')[0]}\n⏳ Tiempo: ${args[0]}`,
        m,
        { mentions: [target] }
      )
    }
  }

  // ✅ Comando principal de desmute
  if (['deshadowban', 'desmute', 'quitarmute', 'unmute'].includes(command)) {

    if (!muted[target])
      return conn.reply(m.chat, '⚠️ *Ese usuario no está muteado.*', m)

    delete muted[target]
    saveMuted()

    // ✅ Registrar en log
    mutelog.push({
      action: 'UNMUTE',
      target,
      by: user,
      date: new Date().toISOString()
    })
    saveLog()

    return conn.reply(
      m.chat,
      `✅ *Usuario desmuteado:* @${target.split('@')[0]}`,
      m,
      { mentions: [target] }
    )
  }

  // ✅ Lista de muteados
  if (command === 'mutelist') {
    if (Object.keys(muted).length === 0)
      return conn.reply(m.chat, '✅ *No hay usuarios muteados.*', m)

    let text = '🛡️ *Usuarios muteados actualmente:*\n\n'

    for (let u in muted) {
      let remaining = muted[u].expires - Date.now()
      let mins = Math.max(1, Math.floor(remaining / 60000))
      text += `• @${u.split('@')[0]} — ${mins} min restantes\n`
    }

    return conn.reply(m.chat, text, m, {
      mentions: Object.keys(muted)
    })
  }

  // ✅ Log de muteos
  if (command === 'mutelog') {
    if (mutelog.length === 0)
      return conn.reply(m.chat, '✅ *No hay registros de mute.*', m)

    let text = '📄 *Registro de muteos:*\n\n'
    for (let log of mutelog.slice(-20)) {
      text += `• ${log.action} — @${log.target?.split('@')[0] || 'N/A'}\n`
      text += `  Por: @${log.by.split('@')[0]}\n`
      if (log.time) text += `  Tiempo: ${log.time}\n`
      if (log.reason) text += `  Razón: ${log.reason}\n`
      text += `  Fecha: ${log.date}\n\n`
    }

    return conn.reply(m.chat, text, m, {
      mentions: mutelog.flatMap(l => [l.target, l.by]).filter(Boolean)
    })
  }

  // ✅ Limpiar log
  if (command === 'clearmutelog') {
    mutelog = []
    saveLog()
    return conn.reply(m.chat, '🧹 *Registro de mute limpiado.*', m)
  }
}

// ✅ TAG para menú Swill (corregido)
handler.tags = ['admin']

// ✅ Comandos
handler.help = ['showban', 'desmute', 'mutelist', 'mutelog', 'clearmutelog']
handler.command = ['showban', 'deshadowban', 'desmute', 'quitarmute', 'unmute', 'mutelist', 'mutelog', 'clearmutelog']

export default handler
