// ✦ Menú Oficial LATAM ✦ Swill v3.6.0
// Diseñado por Mahykol ✦

import { existsSync } from 'fs'
import { join } from 'path'
import { prepareWAMessageMedia, generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, usedPrefix: _p }) => {
  try {
    let help = Object.values(global.plugins)
      .filter(p => !p.disabled)
      .map(p => ({
        help: Array.isArray(p.help) ? p.help : p.help ? [p.help] : [],
        tags: Array.isArray(p.tags) ? p.tags : p.tags ? [p.tags] : [],
        desc: p.desc || null
      }))

    let menuText = `✦ LATAM ✦ Swill ─ Menú Principal ✦

🌐 *Información & Sistema*
🤖 *Inteligencia & Bots*
🎮 *Juegos & Gacha*
💰 *Economía & RPG*
👥 *Grupos & Comunidad*
📥 *Descargas & Multimedia*
🛠️ *Herramientas & Avanzado*
🔎 *Búsqueda & Social*
⭐ *Premium & Custom*
🛡️ *Staff & Moderación*
📚 *Roles & Permisos*
👑 *Owner & Creador*

────────────────────────────
Diseñado por Mahykol ✦ Swill
`

    // Categorías organizadas
    const categories = {
      '🌐 INFO': ['main', 'info'],
      '🤖 INTELIGENCIA': ['bots', 'ia'],
      '🎮 JUEGOS': ['game', 'gacha'],
      '💰 ECONOMÍA': ['economy', 'rpgnk'],
      '👥 GRUPOS': ['group'],
      '📥 DESCARGAS': ['downloader'],
      '🎨 MULTIMEDIA': ['sticker', 'audio', 'anime'],
      '🛠️ TOOLS': ['tools', 'advanced'],
      '🔎 BÚSQUEDA': ['search', 'buscador'],
      '⭐ PREMIUM': ['fun', 'premium', 'social', 'custom'],
      '🛡️ STAFF': ['staff', 'mod'],
      '📚 ROLES': ['roles'],
      '👑 OWNER': ['owner', 'creador'],
    }

    // Iconos por comando
    const icons = {
      // STAFF
      'modmenu': '🛡️',
      'mods': '📋',
      'addmod': '➕',
      'removemod': '➖',

      // ROLES
      'misroles': '🧩',
      'mipermisos': '🔐',
      'roles': '📚',
      'rolesinfo': 'ℹ️',
      'rolinfo': '📘',
    }

    // Descripciones cortas por comando
    const descriptions = {
      // STAFF
      'modmenu': 'Panel de moderación y herramientas del staff.',
      'mods': 'Lista completa de moderadores.',
      'addmod': 'Agregar un nuevo moderador.',
      'removemod': 'Remover un moderador existente.',

      // ROLES
      'misroles': 'Muestra tus roles actuales.',
      'mipermisos': 'Muestra tus permisos activos.',
      'roles': 'Lista de roles disponibles.',
      'rolesinfo': 'Información general de todos los roles.',
      'rolinfo': 'Información detallada de un rol específico.',
    }

    // Construcción del menú dinámico
    for (let catName in categories) {
      let catTags = categories[catName]
      let comandos = help.filter(menu => menu.tags.some(tag => catTags.includes(tag)))

      if (comandos.length) {
        menuText += `\n✦ ${catName} ✦\n`
        let uniqueCommands = [...new Set(comandos.flatMap(menu => menu.help))]

        for (let cmd of uniqueCommands) {
          const icon = icons[cmd] || '➤'
          const desc = descriptions[cmd] ? `   • ${descriptions[cmd]}\n` : ''
          menuText += `${icon} \`${cmd}\`\n${desc}`
        }
      }
    }

    await conn.sendMessage(m.chat, { react: { text: '✨', key: m.key } })

    const localImagePath = join(process.cwd(), 'src', 'menu.jpg')

    const nativeButtons = [
      {
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
          display_text: '📜 Menú Swill',
          id: '.menu'
        })
      },
      {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ 
          display_text: '🌐 Comunidad LATAM', 
          url: 'https://chat.whatsapp.com/K02sv6Fm87fBQvlNKIGOQB' 
        })
      },
    ]

    let header
    if (existsSync(localImagePath)) {
      const media = await prepareWAMessageMedia({ image: { url: localImagePath } }, { upload: conn.waUploadToServer })
      header = proto.Message.InteractiveMessage.Header.fromObject({
        hasMediaAttachment: true,
        imageMessage: media.imageMessage
      })
    } else {
      header = proto.Message.InteractiveMessage.Header.fromObject({ hasMediaAttachment: false })
    }

    const interactiveMessage = proto.Message.InteractiveMessage.fromObject({
      body: proto.Message.InteractiveMessage.Body.fromObject({ text: menuText }),
      footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: '✦ Sistema Swill v3.6.0 ✦' }),
      header,
      nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
        buttons: nativeButtons
      })
    })

    const msg = generateWAMessageFromContent(m.chat, { interactiveMessage }, { userJid: conn.user.jid, quoted: m })
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })

  } catch (e) {
    console.error('❌ Error en el menú:', e)
    await conn.sendMessage(m.chat, {
      text: `🍙 *Menú Básico LATAM ✦ Swill*\n\n• ${_p}menu - Menú principal\n• ${_p}ping - Estado del bot\n• ${_p}prefijos - Ver prefijos\n\n⚠️ *Error:* ${e.message}`
    }, { quoted: m })
  }
}

handler.help = ['menu','help']
handler.tags = ['main']
handler.command = ['Swill', 'menu', 'help']

export default handler
