// Sistema Antilink Ultra Fuerte con Shadowban + Ban Definitivo
// Creado para LATAM ✦ Swill — por Mahykol

let handler = async (m, { conn, args, usedPrefix, command, isAdmin, isBotAdmin }) => {
  const ctxErr = (global.rcanalx || {})
  const ctxWarn = (global.rcanalw || {})
  const ctxOk = (global.rcanalr || {})

  if (!m.isGroup) return conn.reply(m.chat, '❌ Solo puedo usarse en grupos.', m, ctxErr)
  if (!isAdmin) return conn.reply(m.chat, '⚠️ Solo los administradores pueden usar este comando.', m, ctxErr)

  const action = args[0]?.toLowerCase()

  if (!global.antilinkStatus) global.antilinkStatus = {}
  if (!global.antilinkWarnings) global.antilinkWarnings = {}
  if (!global.shadowban) global.shadowban = {}
  if (!global.antilinkStrikes) global.antilinkStrikes = {}

  if (!action) {
    return conn.reply(m.chat, `
╭━━━〔 𝐒𝐈𝐒𝐓𝐄𝐌𝐀 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 🖇️🚫 〕━━━⬣
┃ ➡️ ${usedPrefix}antilink on      → Activar
┃ ➡️ ${usedPrefix}antilink off     → Desactivar
┃ ➡️ ${usedPrefix}antilink status  → Estado
╰━━━━━━━━━━━━━━⬣

> ⚡ *Versión v3 — Shadowban + Ban Definitivo*
    `.trim(), m, ctxWarn)
  }

  switch (action) {
    case 'on':
      global.antilinkStatus[m.chat] = true
      await conn.reply(m.chat, '🛡️ 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐎 ✅️', m, ctxOk)
      break

    case 'off':
      delete global.antilinkStatus[m.chat]
      await conn.reply(m.chat, '🔓 𝐀𝐍𝐓𝐈𝐋𝐈𝐍𝐊 𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐎 ❌', m, ctxWarn)
      break

    case 'status':
      const status = global.antilinkStatus[m.chat] ? '🟢 ACTIVO' : '🔴 DESACTIVADO'
      await conn.reply(m.chat, `🔰 Estado del Antilink: ${status}`, m, ctxOk)
      break

    default:
      await conn.reply(m.chat, '❌ Opción no válida.', m, ctxErr)
  }
}

// ✅ SISTEMA ANTILINK — DETECTOR AUTOMÁTICO
handler.before = async (m, { conn, isAdmin, isBotAdmin }) => {
  try {
    if (m.isBaileys || !m.isGroup) return
    if (!global.antilinkStatus || !global.antilinkStatus[m.chat]) return

    const text = m.text || m.caption || ''
    if (!text) return

    // Inicializar estructuras
    global.antilinkWarnings[m.chat] = global.antilinkWarnings[m.chat] || {}
    global.shadowban[m.chat] = global.shadowban[m.chat] || {}
    global.antilinkStrikes[m.chat] = global.antilinkStrikes[m.chat] || {}

    const now = Date.now()

    // ✅ Si el usuario está en shadowban
    if (global.shadowban[m.chat][m.sender]) {
      const expires = global.shadowban[m.chat][m.sender]

      if (now < expires) {
        // Borrar mensaje
        if (isBotAdmin && m.key) {
          try {
            await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, id: m.key.id, participant: m.sender } })
          } catch {}
        }
        return
      } else {
        // ✅ Shadowban expirado → limpiar
        delete global.shadowban[m.chat][m.sender]
      }
    }

    // ✅ Detectar enlaces
    const patterns = [
      /https?:\/\/[^\s]+/gi,
      /www\.[^\s]+/gi,
      /chat\.whatsapp\.com\/[A-Za-z0-9]+/gi,
      /t\.me\/[^\s]+/gi,
      /instagram\.com\/[^\s]+/gi,
      /facebook\.com\/[^\s]+/gi,
      /youtu\.be\/[^\s]+/gi,
      /youtube\.com\/[^\s]+/gi,
      /discord\.gg\/[^\s]+/gi,
      /bit\.ly\/[^\s]+/gi
    ]

    let hasLink = patterns.some(p => p.test(text))

    // Detectar IP
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/
    if (!hasLink && ipPattern.test(text)) hasLink = true

    if (!hasLink) return
    if (isAdmin) return
    if (m.sender === conn.user.jid) return

    // ✅ Borrar mensaje
    if (isBotAdmin && m.key) {
      try {
        await conn.sendMessage(m.chat, { delete: { remoteJid: m.chat, id: m.key.id, participant: m.sender } })
      } catch {}
    }

    // ✅ Aumentar advertencias
    global.antilinkWarnings[m.chat][m.sender] =
      (global.antilinkWarnings[m.chat][m.sender] || 0) + 1

    const strikes = global.antilinkWarnings[m.chat][m.sender]
    const reincidencia = global.antilinkStrikes[m.chat][m.sender] || 0

    // ✅ STRIKE 1
    if (strikes === 1) {
      return conn.reply(
        m.chat,
        `⚠️ *Advertencia 1/3*\n@${m.sender.split('@')[0]} envió un enlace.\nEvita repetirlo.`,
        m,
        { mentions: [m.sender] }
      )
    }

    // ✅ STRIKE 2
    if (strikes === 2) {
      return conn.reply(
        m.chat,
        `⚠️ *Advertencia 2/3*\n@${m.sender.split('@')[0]} vuelve a enviar enlaces.\nLa próxima será sanción.`,
        m,
        { mentions: [m.sender] }
      )
    }

    // ✅ STRIKE 3 → SHADOWBAN O BAN DEFINITIVO
    if (strikes >= 3) {
      // ✅ Si ya tuvo un shadowban → BAN DEFINITIVO
      if (reincidencia >= 1) {
        conn.reply(
          m.chat,
          `💢 *Ban definitivo*\n@${m.sender.split('@')[0]} reincidió después del shadowban.`,
          m,
          { mentions: [m.sender] }
        )

        if (isBotAdmin) {
          try {
            await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove')
          } catch {}
        }

        // limpiar registros
        delete global.antilinkWarnings[m.chat][m.sender]
        delete global.shadowban[m.chat][m.sender]
        delete global.antilinkStrikes[m.chat][m.sender]
        return
      }

      // ✅ PRIMERA VEZ → SHADOWBAN 30 MINUTOS
      const duration = 30 * 60 * 1000 // 30 minutos
      global.shadowban[m.chat][m.sender] = now + duration
      global.antilinkStrikes[m.chat][m.sender] = 1
      global.antilinkWarnings[m.chat][m.sender] = 0

      return conn.reply(
        m.chat,
        `⛔ *Shadowban aplicado (30 minutos)*\n@${m.sender.split('@')[0]} ignoró las advertencias.\nSi reincide → *ban definitivo*.`,
        m,
        { mentions: [m.sender] }
      )
    }

  } catch (err) {
    console.error('Error en antilink.before:', err)
  }
}

handler.help = ['antilink']
handler.tags = ['group']
handler.command = ['antilink', 'antienlace']
handler.group = true
handler.admin = true
handler.botAdmin = true

export default handler
