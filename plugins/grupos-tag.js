import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import * as fs from 'fs'
import { decodeJidCompat } from '../lib/utils.js'

const handler = async (m, { conn, text, participants, isOwner, isAdmin }) => {
  try {
    // ✅ Permisos Swill: ROOWNER, OWNER, MODS, ADMINS
    const isROwner = global.roowner?.includes(m.sender)
    const isMod = global.mods?.includes(m.sender)
    const isPower = isROwner || isOwner || isMod || isAdmin

    if (!isPower) {
      global.dfail('admin', m, conn)
      return
    }

    const users = participants.map((u) => (typeof conn.decodeJid === 'function' ? conn.decodeJid(u.id) : decodeJidCompat(u.id)))
    const q = m.quoted ? m.quoted : m || m.text || m.sender
    const c = m.quoted ? await m.getQuotedObj() : m.msg || m.text || m.sender

    // ✅ Reenvío avanzado con menciones ocultas
    const msg = conn.cMod(
      m.chat,
      generateWAMessageFromContent(
        m.chat,
        {
          [m.quoted ? q.mtype : 'extendedTextMessage']:
            m.quoted ? c.message[q.mtype] : { text: '' || c }
        },
        { quoted: m, userJid: conn.user.id }
      ),
      text || q.text,
      conn.user.jid,
      { mentions: users }
    )

    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

  } catch {
    // ✅ Fallback si falla el reenvío avanzado
    const users = participants.map((u) => (typeof conn.decodeJid === 'function' ? conn.decodeJid(u.id) : decodeJidCompat(u.id)))
    const quoted = m.quoted ? m.quoted : m
    const mime = (quoted.msg || quoted).mimetype || ''
    const isMedia = /image|video|sticker|audio/.test(mime)

    const more = String.fromCharCode(8206)
    const masss = more.repeat(850)

    const htextos = `${text ? text : '*🌟 Debes enviar un texto para hacer un tag.*'}`

    // ✅ Tagall con imagen
    if ((isMedia && quoted.mtype === 'imageMessage') && htextos) {
      const mediax = await quoted.download?.()
      conn.sendMessage(
        m.chat,
        { image: mediax, mentions: users, caption: htextos },
        { quoted: m }
      )

    // ✅ Tagall con video
    } else if ((isMedia && quoted.mtype === 'videoMessage') && htextos) {
      const mediax = await quoted.download?.()
      conn.sendMessage(
        m.chat,
        { video: mediax, mentions: users, mimetype: 'video/mp4', caption: htextos },
        { quoted: m }
      )

    // ✅ Tagall con audio
    } else if ((isMedia && quoted.mtype === 'audioMessage') && htextos) {
      const mediax = await quoted.download?.()
      conn.sendMessage(
        m.chat,
        { audio: mediax, mentions: users, mimetype: 'audio/mpeg', fileName: `Hidetag.mp3` },
        { quoted: m }
      )

    // ✅ Tagall con sticker
    } else if ((isMedia && quoted.mtype === 'stickerMessage') && htextos) {
      const mediax = await quoted.download?.()
      conn.sendMessage(
        m.chat,
        { sticker: mediax, mentions: users },
        { quoted: m }
      )

    // ✅ Tagall oculto (texto invisible)
    } else {
      await conn.relayMessage(
        m.chat,
        {
          extendedTextMessage: {
            text: `${masss}\n${htextos}\n`,
            contextInfo: {
              mentionedJid: users,
              externalAdReply: {
                thumbnail: imagen1,
                sourceUrl: md
              }
            }
          }
        },
        {}
      )
    }
  }
}

handler.help = ['tag']
handler.tags = ['admin']
handler.command = ['tag']
handler.group = true
handler.admin = false // ✅ Ahora depende de permisos Swill

export default handler
