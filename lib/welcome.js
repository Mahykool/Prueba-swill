/*
✨ Creado por: Mahykol
📚 Sistema Welcome v3.4.0 Beta
(espacio reservado para comentarios futuros o personalización)
*/
// lib/welcome.js
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { jidNormalizedUser } from '@whiskeysockets/baileys'
import fetch from 'node-fetch'
import { decodeJidCompat } from './utils.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TEMP_DIR = path.join(__dirname, '../temp')
const WELCOME_STATE_FILE = path.join(TEMP_DIR, 'welcome_state.json')

function ensureDir(p) {
  try { fs.mkdirSync(p, { recursive: true }) } catch {}
}

function loadWelcomeState() {
  try {
    if (fs.existsSync(WELCOME_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(WELCOME_STATE_FILE, 'utf8'))
    }
  } catch (error) {
    console.error('Error loading welcome state:', error)
  }
  return {}
}

function saveWelcomeState(state) {
  try {
    ensureDir(path.dirname(WELCOME_STATE_FILE))
    fs.writeFileSync(WELCOME_STATE_FILE, JSON.stringify(state, null, 2))
  } catch (error) {
    console.error('Error saving welcome state:', error)
  }
}

export function isWelcomeEnabled(jid) {
  const state = loadWelcomeState()
  return state[jid] !== false
}

export function setWelcomeState(jid, enabled) {
  const state = loadWelcomeState()
  state[jid] = enabled
  saveWelcomeState(state)
  return enabled
}

async function loadImageSmart(src) {
  if (!src) return null
  try {
    if (/^https?:\/\//i.test(src)) {
      const res = await fetch(src)
      if (!res.ok) throw new Error('fetch fail')
      const buf = Buffer.from(await res.arrayBuffer())
      return await loadImage(buf)
    }
    return await loadImage(src)
  } catch {
    return null
  }
}

export async function makeCard({ title = 'Bienvenida', subtitle = '', avatarUrl = '', bgUrl = '', badgeUrl = '' }) {
  const width = 900, height = 380
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')

  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#06141f')
  gradient.addColorStop(1, '#0b2a3b')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.lineWidth = 12
  ctx.strokeStyle = '#19c3ff'
  ctx.strokeRect(6, 6, width - 12, height - 12)

  if (bgUrl) {
    try {
      const bg = await loadImageSmart(bgUrl)
      const pad = 18
      ctx.globalAlpha = 0.9
      if (bg) ctx.drawImage(bg, pad, pad, width - pad * 2, height - pad * 2)
      ctx.globalAlpha = 1
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fillRect(pad, pad, width - pad * 2, height - pad * 2)
    } catch {}
  }

  let avatarUsedInCenter = false
  let centerR = 54
  let centerCX = Math.round(width / 2)
  let centerCY = 86
  try {
    const useCenterAvatar = !badgeUrl && !!avatarUrl
    centerR = useCenterAvatar ? 80 : 54
    centerCY = useCenterAvatar ? Math.round(height / 2) : 86
    const centerSrc = (badgeUrl && badgeUrl.trim()) ? badgeUrl : (avatarUrl || '')
    if (centerSrc) {
      const badge = await loadImageSmart(centerSrc)
      ctx.save()
      ctx.beginPath(); ctx.arc(centerCX, centerCY, centerR, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
      if (badge) ctx.drawImage(badge, centerCX - centerR, centerCY - centerR, centerR * 2, centerR * 2)
      ctx.restore()
      ctx.lineWidth = 6
      ctx.strokeStyle = '#19c3ff'
      ctx.beginPath(); ctx.arc(centerCX, centerCY, centerR + 4, 0, Math.PI * 2); ctx.stroke()
      avatarUsedInCenter = useCenterAvatar
    }
  } catch {}

  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#000000'
  ctx.shadowBlur = 8
  ctx.font = 'bold 48px Sans'
  const titleY = avatarUsedInCenter ? 70 : 178
  ctx.fillText(title, width / 2, titleY)
  ctx.shadowBlur = 0

  ctx.fillStyle = '#d8e1e8'
  ctx.font = '28px Sans'
  const lines = Array.isArray(subtitle) ? subtitle : [subtitle]
  const subBaseY = avatarUsedInCenter ? (centerCY + centerR + 28) : 218
  lines.forEach((t, i) => ctx.fillText(String(t || ''), width / 2, subBaseY + i * 34))

  if (avatarUrl && !avatarUsedInCenter) {
    try {
      const av = await loadImageSmart(avatarUrl)
      const r = 64
      const x = width - 120, y = height - 120
      ctx.save()
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
      if (av) ctx.drawImage(av, x - r, y - r, r * 2, r * 2)
      ctx.restore()
      ctx.lineWidth = 5
      ctx.strokeStyle = '#19c3ff'
      ctx.beginPath(); ctx.arc(x, y, r + 3, 0, Math.PI * 2); ctx.stroke()
    } catch {}
  }

  return canvas.toBuffer('image/png')
}

const bienvenidasComicas = [
  "🎉 *Un nuevo tupidx entró al grupo...* (Se rumorea que vino buscando WiFi gratis, pero encontró la Comunidad LATAM ✦ Swill)",
  "🎉 *Bienvenido/a al caos organizado LATAM ✦ Swill* (Aquí los memes son más rápidos que la inteligencia artificial)",
  "🎉 *El tupidx apareció...* (Entró pensando que era el grupo de la familia, pero cayó en el mejor lugar)",
  "🎉 *Nuevo jugador se ha unido...* (Que traiga pan con palta, porque aquí se comparte todo menos el WiFi)",
  "🎉 *Bienvenido/a...* (La inteligencia lo rastreó y lo trajo hasta aquí, ahora no hay escape)",
  "🎉 *El tupidx entró al grupo...* (Se dice que vino por los stickers, pero se quedará por la buena onda)",
  "🎉 *Bienvenido/a a LATAM ✦ Swill* (Aquí hasta los admins bailan reggaetón cuando llega alguien nuevo)",
  "🎉 *El tupidx se conectó...* (La IA lo estaba persiguiendo, pero el grupo lo protegió con memes)",
  "🎉 *Un nuevo integrante apareció...* (Se arrancó del ban y cayó directo en la Comunidad LATAM ✦ Swill)",
  "🎉 *Bienvenido/a...* (El algoritmo lo eligió, pero la comunidad lo celebra con palta y humor)"
]

const despedidasComicas = [
  "🤣 *El tupidx salió del grupo...* (Se fue porque perdió contra el bot en piedra, papel o tijera)",
  "🤣 *El tupidx abandonó la sala...* (Lo expulsó el WiFi por exceso de memes)",
  "🤣 *El tupidx huyó del grupo...* (Se fue a comprar pan con palta y nunca volvió)",
  "🤣 *El tupidx ragequitteó...* (Se desconectó antes de la partida final de Free Fire)",
  "🤣 *El tupidx salió corriendo...* (Lo persiguió el admin con la chancla digital)",
  "🤣 *El tupidx desapareció...* (Última vez visto en la dimensión de los stickers)",
  "🤣 *El tupidx se desconectó...* (El WiFi dijo: 'Hasta aquí llegamos')",
  "🤣 *El tupidx abandonó el grupo...* (Se fue a bailar reggaetón con los admins)",
  "🤣 *El tupidx salió del grupo...* (Lo confundieron con un bot y lo expulsaron)",
  "🤣 *El tupidx se fue...* (Quería ser protagonista del drama, pero nadie lo extrañó)"
]

export async function sendWelcomeOrBye(conn, { jid, userName = 'Usuario', type = 'welcome', groupName = '', participant }) {
  try {
    ensureDir(TEMP_DIR)
    if (!isWelcomeEnabled(jid)) {
      console.log(`⚠️ Welcome/Bye desactivado para el grupo: ${jid}`)
      return null
    }

    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
    const messageText = type === 'welcome' ? pick(bienvenidasComicas) : pick(despedidasComicas)

    let avatarUrl = ''
    try { if (participant) avatarUrl = await conn.profilePictureUrl(participant, 'image') } catch {}
    if (!avatarUrl) avatarUrl = 'https://files.catbox.moe/xr2m6u.jpg'

    const BG_IMAGES = [
      'https://freeimage.host/i/fqvyaZQ',
      'https://freeimage.host/i/fqvyaZQ'
    ]
    const bgUrl = pick(BG_IMAGES)

    const buff = await makeCard({ title: messageText, subtitle: '', avatarUrl, bgUrl })
    const file = path.join(TEMP_DIR, `${type}-${Date.now()}.png`)
    fs.writeFileSync(file, buff)

    const who = participant || ''
    let realJid = who
    try {
      realJid = (typeof conn?.decodeJid === 'function' ? conn.decodeJid(realJid) : decodeJidCompat(realJid))
    } catch {}
    try { realJid = jidNormalizedUser(realJid) } catch {}
    const number = String(realJid).replace(/\D+/g, '')
    const taguser = number ? `@${number}` : (userName || 'Usuario')

    let meta = null
    try { meta = await conn.groupMetadata(jid) } catch {}
    const totalMembers = Array.isArray(meta?.participants) ? meta.participants.length : 0
    const groupSubject = meta?.subject || groupName || ''
    const tipo = type === 'welcome' ? 'Bienvenid@' : 'Despedida'
    const date = new Date().toLocaleString('es-PE', { year: 'numeric', month: '2-digit', day: '2-digit', hour12: false, hour: '2-digit', minute: '2-digit' })

    let fkontak = null
    try {
      const res = await fetch('https://i.postimg.cc/rFfVL8Ps/image.jpg')
      const thumb2 = Buffer.from(await res.arrayBuffer())
      fkontak = { key: { participant: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' }, message: { locationMessage: { name: `${tipo}`, jpegThumbnail: thumb2 } }, participant: '0@s.whatsapp.net' }
    } catch {}

    const productMessage = {
      product: {
        productImage: { url: file },
        productId: '24529689176623820',
        title: `${tipo}, ᴀʜᴏʀᴀ sᴏᴍᴏs ${totalMembers}`,
        description: '',
        currencyCode: 'USD',
        priceAmount1000: '100000',
        retailerId: 1677,
        url: `https://wa.me/${number}`,
        productImageCount: 1
      },
      businessOwnerJid: who || '0@s.whatsapp.net',
      caption: `${messageText}\n\n*👤 Usuario*: ${taguser}\n*🏷 Grupo*: ${groupSubject}\n*👥 Miembros*: ${totalMembers}\n*📅 Fecha*: ${date}`.trim(),
      title: '',
      subtitle: '',
      footer: groupSubject || '',
      interactiveButtons: [
        {
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: '📜 Menú Swill',
            id: '.menu'
          })
        }
      ],
      mentions: who ? [who] : []
    }

    const mentionId = who ? [who] : []
    try {
      await conn.sendMessage(jid, productMessage, { quoted: fkontak || undefined, contextInfo: { mentionedJid: mentionId } })
    } catch (e) {
      console.error('Error sending welcome message:', e)
    }

    return file
  } catch (e) {
    console.error('sendWelcomeOrBye error:', e)
    return null
  }
}

export default {
  makeCard,
  sendWelcomeOrBye,
  isWelcomeEnabled,
  setWelcomeState
}
