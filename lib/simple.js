// lib/simple.js
import path from 'path'
import fs from 'fs'
import util, { format } from 'util'
import fetch from 'node-fetch'
import PhoneNumber from 'awesome-phonenumber'
import { fileTypeFromBuffer } from 'file-type'
import { fileURLToPath } from 'url'
import * as baileysImport from '@whiskeysockets/baileys'
import Jimp from 'jimp'
import pino from 'pino'
import { toAudio } from './converter.js'
import store from './store.js'
import { randomBytes as _randomBytes } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const randomBytes = typeof global?.randomBytes === 'function' ? global.randomBytes : _randomBytes

// Safe defaults (adjust in your project)
const wm = typeof global?.wm !== 'undefined' ? global.wm : 'MiBotSwill • 2025'
const S_WHATSAPP_NET = typeof global?.S_WHATSAPP_NET !== 'undefined' ? global.S_WHATSAPP_NET : 's.whatsapp.net'

// Lazy baileys import wrapper to avoid top-level await issues
const baileys = (baileysImport && baileysImport.default) ? baileysImport.default : baileysImport

/**
 * Safe helper to read a path/URL/dataURI/Buffer and return normalized info
 * Returns: { res, filename, mime, ext, data, deleteFile() }
 */
export async function safeGetFile(PATH, saveToFile = false) {
  let res = null
  let filename = null
  let data = null

  try {
    if (Buffer.isBuffer(PATH)) {
      data = PATH
    } else if (PATH instanceof ArrayBuffer) {
      data = Buffer.from(PATH)
    } else if (typeof PATH === 'string' && /^data:.*;base64,/.test(PATH)) {
      data = Buffer.from(PATH.split(',')[1], 'base64')
    } else if (typeof PATH === 'string' && /^https?:\/\//.test(PATH)) {
      res = await fetch(PATH)
      data = await res.buffer()
    } else if (typeof PATH === 'string' && fs.existsSync(PATH)) {
      filename = PATH
      data = fs.readFileSync(PATH)
    } else if (typeof PATH === 'string') {
      data = Buffer.from(PATH)
    } else {
      data = Buffer.alloc(0)
    }
  } catch (e) {
    throw new TypeError('Error reading PATH: ' + (e?.message || e))
  }

  if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')

  const type = (await fileTypeFromBuffer(data)) || { mime: 'application/octet-stream', ext: 'bin' }

  if (data && saveToFile && !filename) {
    filename = path.join(__dirname, '../tmp', `${Date.now()}.${type.ext}`)
    await fs.promises.mkdir(path.dirname(filename), { recursive: true }).catch(() => {})
    await fs.promises.writeFile(filename, data)
  }

  return {
    res,
    filename,
    mime: type.mime,
    ext: type.ext,
    data,
    deleteFile() {
      return filename && fs.promises.unlink(filename)
    },
  }
}

/* -------------------------
   Small helpers
   ------------------------- */
function nullish(v) {
  return v === null || v === undefined
}
function getRandom() {
  if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)]
  return Math.floor(Math.random() * this)
}
function chalkSafe(level) {
  try {
    // lazy require to avoid failing if chalk not installed
    // eslint-disable-next-line global-require
    const chalk = require('chalk')
    switch (level) {
      case 'INFO':
        return chalk.bold.bgRgb(51, 204, 51)('INFO ')
      case 'ERROR':
        return chalk.bold.bgRgb(247, 38, 33)('ERROR ')
      case 'WARN':
        return chalk.bold.bgRgb(255, 153, 0)('WARNING ')
      case 'DEBUG':
        return chalk.bold.bgRgb(66, 167, 245)('DEBUG ')
      default:
        return chalk.grey(level)
    }
  } catch {
    return level
  }
}

/* -------------------------
   makeWASocket: main factory
   ------------------------- */
export async function makeWASocket(connectionOptions, options = {}) {
  const {
    default: _makeWaSocket,
    makeWALegacySocket,
    proto,
    downloadContentFromMessage,
    jidDecode,
    areJidsSameUser,
    generateWAMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    WAMessageStubType,
    extractMessageContent,
    makeInMemoryStore,
    getAggregateVotesInPollMessage,
    prepareWAMessageMedia,
    WA_DEFAULT_EPHEMERAL,
  } = baileys.default ? baileys.default : baileys

  const conn = (global?.opts?.legacy ? makeWALegacySocket : _makeWaSocket)(connectionOptions)

  // Wrap sendMessage to inject global contextInfo if present
  const originalSendMessage = conn.sendMessage?.bind(conn)
  if (originalSendMessage) {
    conn.sendMessage = async function (jid, content, opts = {}) {
      let newContent = { ...content }
      if (global?.rcanal?.contextInfo) {
        const existingContext = newContent.contextInfo || {}
        newContent.contextInfo = { ...existingContext, ...global.rcanal.contextInfo }
      }
      return originalSendMessage(jid, newContent, opts)
    }
  }

  const sock = Object.defineProperties(conn, {
    chats: { value: { ...(options.chats || {}) }, writable: true },

    decodeJid: {
      value(jid) {
        if (!jid) return jid || null
        if (typeof jid !== 'string') return jid
        try {
          if (typeof jidDecode === 'function') {
            const dec = jidDecode(jid)
            if (dec && dec.user && dec.server) return `${dec.user}@${dec.server}`
          }
          return String(jid).split(':')[0]
        } catch {
          return String(jid).split(':')[0]
        }
      },
      enumerable: true,
    },

    logger: {
      get() {
        return {
          info(...args) {
            console.log(chalkSafe('INFO'), `[${new Date().toUTCString()}]:`, format(...args))
          },
          error(...args) {
            console.log(chalkSafe('ERROR'), `[${new Date().toUTCString()}]:`, format(...args))
          },
          warn(...args) {
            console.log(chalkSafe('WARN'), `[${new Date().toUTCString()}]:`, format(...args))
          },
          debug(...args) {
            console.log(chalkSafe('DEBUG'), `[${new Date().toUTCString()}]:`, format(...args))
          },
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendFile: robust media sender
       ------------------------- */
    sendFile: {
      async value(jid, PATH, filename = '', caption = '', quoted, ptt = false, options = {}) {
        try {
          const type = await safeGetFile(PATH, true)
          let { data: file, filename: pathFile } = type
          if (!file || !Buffer.isBuffer(file)) {
            if (pathFile && fs.existsSync(pathFile)) file = fs.readFileSync(pathFile)
          }
          if (!file || file.length === 0) throw new Error('File is empty or invalid')

          let mtype = ''
          let mimetype = options.mimetype || type.mime
          let convert

          if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
          else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
          else if (/video/.test(type.mime)) mtype = 'video'
          else if (/audio/.test(type.mime)) {
            convert = await toAudio(file, type.ext).catch(() => null)
            if (convert) {
              file = convert.data
              pathFile = convert.filename
              mtype = 'audio'
              mimetype = options.mimetype || 'audio/mpeg; codecs=opus'
            } else {
              mtype = 'audio'
            }
          } else mtype = 'document'
          if (options.asDocument) mtype = 'document'

          delete options.asSticker
          delete options.asLocation
          delete options.asVideo
          delete options.asDocument
          delete options.asImage

          const message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathFile || undefined },
            mimetype,
            fileName: filename || (pathFile ? pathFile.split('/').pop() : `file.${type.ext}`),
          }

          let m = null
          try {
            m = await conn.sendMessage(jid, message, { quoted, ...options })
          } catch (e) {
            m = await conn.sendMessage(jid, { ...message, [mtype]: file }, { quoted, ...options })
          } finally {
            file = null
            return m
          }
        } catch (e) {
          console.error('sendFile error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       reply helper
       ------------------------- */
    reply: {
      value(jid, text = '', quoted, options = {}) {
        return Buffer.isBuffer(text)
          ? conn.sendFile(jid, text, 'file', '', quoted, false, options)
          : conn.sendMessage(jid, { ...options, text }, { quoted, ...options })
      },
      enumerable: true,
    },

    /* -------------------------
       sendContact helper
       ------------------------- */
    sendContact: {
      async value(jid, data, quoted, options = {}) {
        try {
          if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
          const contacts = []
          for (let [number, name] of data) {
            number = number.replace(/[^0-9]/g, '')
            const njid = number + '@s.whatsapp.net'
            const biz = (await conn.getBusinessProfile(njid).catch(() => null)) || {}
            const vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}${biz.description ? `
X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || conn.getName(njid) || name).replace(/\n/, '\\n')}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, '\\n')}
`.trim() : ''}
END:VCARD
`.trim()
            contacts.push({ vcard, displayName: name })
          }
          return await conn.sendMessage(jid, {
            ...options,
            contacts: {
              ...options,
              displayName: (contacts.length >= 2 ? `${contacts.length} kontak` : contacts[0].displayName) || null,
              contacts,
            },
          }, { quoted, ...options })
        } catch (e) {
          console.error('sendContact error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       parseMention: basic mention parser
       ------------------------- */
    parseMention: {
      value(text = '') {
        try {
          const esNumeroValido = (numero) => {
            const len = numero.length
            if (len < 8 || len > 13) return false
            if (len > 10 && numero.startsWith('9')) return false
            const codigosValidos = [
              '1','7','20','27','30','31','32','33','34','36','39','40','41','43','44','45','46','47','48','49','51','52','53','54','55','56','57','58','60','61','62','63','64','65','66','81','82','84','86','90','91','92','93','94','95','98','211','212','213','216','218','220','221','222','223','224','225','226','227','228','229','230','231','232','233','234','235','236','237','238','239','240','241','242','243','244','245','246','248','249','250','251','252','253','254','255','256','257','258','260','261','262','263','264','265','266','267','268','269','290','291','297','298','299','350','351','352','353','354','355','356','357','358','359','370','371','372','373','374','375','376','377','378','379','380','381','382','383','385','386','387','389','420','421','423','500','501','502','503','504','505','506','507','508','509','590','591','592','593','594','595','596','597','598','599','670','672','673','674','675','676','677','678','679','680','681','682','683','685','686','687','688','689','690','691','692','850','852','853','855','856','880','886','960','961','962','963','964','965','966','967','968','970','971','972','973','974','975','976','977','978','979','992','993','994','995','996','998'
            ]
            return codigosValidos.some((codigo) => numero.startsWith(codigo))
          }
          return (text.match(/@(\d{5,20})/g) || [])
            .map((m) => m.substring(1))
            .map((numero) => (esNumeroValido(numero) ? `${numero}@s.whatsapp.net` : `${numero}@lid`))
        } catch (e) {
          console.error('parseMention error:', e)
          return []
        }
      },
      enumerable: true,
    },

    /* -------------------------
       loadMessage: find message in conn.chats by id
       ------------------------- */
    loadMessage: {
      value(messageID) {
        try {
          return Object.entries(conn.chats)
            .filter(([_, { messages }]) => typeof messages === 'object')
            .find(([_, { messages }]) =>
              Object.entries(messages).find(([k, v]) => k === messageID || v.key?.id === messageID),
            )?.[1].messages?.[messageID]
        } catch (e) {
          return null
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendList: simple list sender
       ------------------------- */
    sendList: {
      async value(jid, title, text, buttonText, listSections, quoted, options = {}) {
        try {
          const sections = Array.isArray(listSections) ? listSections : []
          const message = {
            interactiveMessage: {
              header: { title: title || '' },
              body: { text: text || '' },
              nativeFlowMessage: {
                buttons: [{
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({ title: buttonText || 'Select', sections }),
                }],
                messageParamsJson: '',
              },
            },
          }
          const msg = await generateWAMessageFromContent(jid, { viewOnceMessage: { message } }, { userJid: conn.user?.jid, quoted, upload: conn.waUploadToServer })
          await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
        } catch (e) {
          console.error('sendList error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendEvent: event message
       ------------------------- */
    sendEvent: {
      async value(jid, text, des, loc, link) {
        try {
          const msg = await generateWAMessageFromContent(jid, {
            messageContextInfo: { messageSecret: randomBytes(32) },
            eventMessage: {
              isCanceled: false,
              name: text,
              description: des,
              location: { degreesLatitude: 0, degreesLongitude: 0, name: loc },
              joinLink: link,
              startTime: 'm.messageTimestamp',
            },
          }, {})
          await conn.relayMessage(jid, msg.message, { messageId: msg.key.id })
        } catch (e) {
          console.error('sendEvent error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendPoll: simple poll creation
       ------------------------- */
    sendPoll: {
      async value(jid, name = '', optiPoll = [], options = {}) {
        try {
          if (!Array.isArray(optiPoll[0]) && typeof optiPoll[0] === 'string') optiPoll = [optiPoll]
          const pollMessage = {
            name,
            options: optiPoll.map((btn) => ({ optionName: (!nullish(btn[0]) && btn[0]) || '' })),
            selectableOptionsCount: 1,
          }
          return conn.relayMessage(jid, { pollCreationMessage: pollMessage }, { ...options })
        } catch (e) {
          console.error('sendPoll error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendHydrated: template buttons (robust)
       ------------------------- */
    sendHydrated: {
      async value(jid, text = '', footer = '', buffer, url, urlText, call, callText, buttons = [], quoted, options = {}) {
        try {
          let type
          if (buffer) {
            try { type = await safeGetFile(buffer); buffer = type.data } catch { buffer = buffer }
          }
          // normalize arrays
          const templateButtons = []
          if (url || urlText) {
            const urls = Array.isArray(url) ? url : [url]
            const urlTexts = Array.isArray(urlText) ? urlText : [urlText]
            urls.forEach((v, i) => templateButtons.push({
              index: templateButtons.length + 1,
              urlButton: { displayText: urlTexts[i] || v || '', url: v || urlTexts[i] || '' },
            }))
          }
          if (call || callText) {
            const calls = Array.isArray(call) ? call : [call]
            const callTexts = Array.isArray(callText) ? callText : [callText]
            calls.forEach((v, i) => templateButtons.push({
              index: templateButtons.length + 1,
              callButton: { displayText: callTexts[i] || v || '', phoneNumber: v || callTexts[i] || '' },
            }))
          }
          if (buttons && buttons.length) {
            if (!Array.isArray(buttons[0])) buttons = [buttons]
            buttons.forEach(([t, id]) => templateButtons.push({
              index: templateButtons.length + 1,
              quickReplyButton: { displayText: (!nullish(t) && t) || (!nullish(id) && id) || '', id: (!nullish(id) && id) || (!nullish(t) && t) || '' },
            }))
          }
          const message = {
            ...options,
            [buffer ? 'caption' : 'text']: text || '',
            footer: footer || '',
            templateButtons,
            ...(buffer ? (options.asLocation && /image/.test(type?.mime) ? { location: { ...options, jpegThumbnail: buffer } } : { [/video/.test(type?.mime) ? 'video' : /image/.test(type?.mime) ? 'image' : 'document']: buffer }) : {}),
          }
          return await conn.sendMessage(jid, message, { quoted, upload: conn.waUploadToServer, ...options })
        } catch (e) {
          console.error('sendHydrated error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendHydrated2: variant with two URLs
       ------------------------- */
    sendHydrated2: {
      async value(jid, text = '', footer = '', buffer, url, urlText, url2, urlText2, buttons = [], quoted, options = {}) {
        try {
          let type
          if (buffer) {
            try { type = await safeGetFile(buffer); buffer = type.data } catch { buffer = buffer }
          }
          const templateButtons = []
          const pushUrlButtons = (u, ut) => {
            const urls = Array.isArray(u) ? u : [u]
            const uts = Array.isArray(ut) ? ut : [ut]
            urls.forEach((v, i) => templateButtons.push({
              index: templateButtons.length + 1,
              urlButton: { displayText: uts[i] || v || '', url: v || uts[i] || '' },
            }))
          }
          if (url || urlText) pushUrlButtons(url, urlText)
          if (url2 || urlText2) pushUrlButtons(url2, urlText2)
          if (buttons && buttons.length) {
            if (!Array.isArray(buttons[0])) buttons = [buttons]
            buttons.forEach(([t, id]) => templateButtons.push({
              index: templateButtons.length + 1,
              quickReplyButton: { displayText: (!nullish(t) && t) || (!nullish(id) && id) || '', id: (!nullish(id) && id) || (!nullish(t) && t) || '' },
            }))
          }
          const message = {
            ...options,
            [buffer ? 'caption' : 'text']: text || '',
            footer: footer || '',
            templateButtons,
            ...(buffer ? (options.asLocation && /image/.test(type?.mime) ? { location: { ...options, jpegThumbnail: buffer } } : { [/video/.test(type?.mime) ? 'video' : /image/.test(type?.mime) ? 'image' : 'document']: buffer }) : {}),
          }
          return await conn.sendMessage(jid, message, { quoted, upload: conn.waUploadToServer, ...options })
        } catch (e) {
          console.error('sendHydrated2 error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendCarousel / sendNCarousel / sendButton / sendAdonix
       Robust implementations using prepareWAMessageMedia and generateWAMessageFromContent
       ------------------------- */
    sendNCarousel: {
      async value(jid, text = '', footer = '', buffer, buttons = [], copy = null, urls = [], list = [], quoted, options = {}) {
        try {
          // Build interactiveMessage similar to earlier implementation
          let img = null, video = null
          if (buffer) {
            try {
              const type = await safeGetFile(buffer).catch(() => null)
              if (type && /^image\//i.test(type.mime)) img = await prepareWAMessageMedia({ image: type.data }, { upload: conn.waUploadToServer, ...options })
              else if (type && /^video\//i.test(type.mime)) video = await prepareWAMessageMedia({ video: type.data }, { upload: conn.waUploadToServer, ...options })
            } catch (e) { /* ignore */ }
          }
          const dynamicButtons = (buttons || []).map((btn) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn[0], id: btn[1] }) }))
          if (copy && (typeof copy === 'string' || typeof copy === 'number')) dynamicButtons.push({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copy', copy_code: copy }) })
          ;(urls || []).forEach((u) => dynamicButtons.push({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: u[0], url: u[1], merchant_url: u[1] }) }))
          ;(list || []).forEach((l) => dynamicButtons.push({ name: 'single_select', buttonParamsJson: JSON.stringify({ title: l[0], sections: l[1] }) }))

          const interactiveMessage = {
            body: { text: text || '' },
            footer: { text: footer || wm },
            header: { hasMediaAttachment: !!(img?.imageMessage || video?.videoMessage), imageMessage: img?.imageMessage || null, videoMessage: video?.videoMessage || null },
            nativeFlowMessage: { buttons: dynamicButtons.filter(Boolean), messageParamsJson: '' },
            mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
            contextInfo: { mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [] },
            ...(options || {}),
          }

          const messageContent = proto.Message.fromObject({ viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage } } })
          const msgs = await generateWAMessageFromContent(jid, messageContent, { userJid: conn.user?.jid, quoted, upload: conn.waUploadToServer, ephemeralExpiration: WA_DEFAULT_EPHEMERAL })
          await conn.relayMessage(jid, msgs.message, { messageId: msgs.key.id })
        } catch (e) {
          console.error('sendNCarousel error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    sendCarousel: {
      async value(jid, text = '', footer = '', text2 = '', messages = [], quoted, options = {}) {
        try {
          if (!Array.isArray(messages) || messages.length === 0) return
          if (messages.length > 1) {
            const cards = await Promise.all(messages.map(async ([ctext = '', cfooter = '', buffer = null, buttons = [], copy = null, urls = [], list = []]) => {
              let img = null, video = null
              if (buffer) {
                try {
                  const type = await safeGetFile(buffer).catch(() => null)
                  if (type && /^image\//i.test(type.mime)) img = await prepareWAMessageMedia({ image: type.data }, { upload: conn.waUploadToServer, ...options })
                  else if (type && /^video\//i.test(type.mime)) video = await prepareWAMessageMedia({ video: type.data }, { upload: conn.waUploadToServer, ...options })
                } catch (e) { /* ignore */ }
              }
              const dynamicButtons = (buttons || []).map((btn) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn[0], id: btn[1] }) }))
              copy = Array.isArray(copy) ? copy : copy ? [copy] : []
              copy.forEach((c) => dynamicButtons.push({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copy', copy_code: Array.isArray(c) ? c[0] : c }) }))
              ;(urls || []).forEach((u) => dynamicButtons.push({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: u[0], url: u[1], merchant_url: u[1] }) }))
              ;(list || []).forEach((l) => dynamicButtons.push({ name: 'single_select', buttonParamsJson: JSON.stringify({ title: l[0], sections: l[1] }) }))
              return {
                body: proto.Message.InteractiveMessage.Body.fromObject({ text: ctext || '' }),
                footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: cfooter || wm }),
                header: proto.Message.InteractiveMessage.Header.fromObject({ title: text2, subtitle: ctext || '', hasMediaAttachment: !!(img?.imageMessage || video?.videoMessage), imageMessage: img?.imageMessage || null, videoMessage: video?.videoMessage || null }),
                nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ buttons: dynamicButtons.filter(Boolean), messageParamsJson: '' }),
                mentions: typeof ctext === 'string' ? conn.parseMention(ctext || '@0') : [],
                contextInfo: { mentionedJid: typeof ctext === 'string' ? conn.parseMention(ctext || '@0') : [] },
                ...(options || {}),
              }
            }))
            const interactiveMessage = proto.Message.InteractiveMessage.create({
              body: proto.Message.InteractiveMessage.Body.fromObject({ text: text || '' }),
              footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || wm }),
              header: proto.Message.InteractiveMessage.Header.fromObject({ title: text || '', subtitle: text || '', hasMediaAttachment: false }),
              carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards }),
              mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
              contextInfo: { mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [] },
              ...(options || {}),
            })
            const messageContent = proto.Message.fromObject({ viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage } } })
            const msgs = await generateWAMessageFromContent(jid, messageContent, { userJid: conn.user?.jid, quoted, upload: conn.waUploadToServer, ephemeralExpiration: WA_DEFAULT_EPHEMERAL })
            await conn.relayMessage(jid, msgs.message, { messageId: msgs.key.id })
          } else {
            await conn.sendNCarousel(jid, ...messages[0], quoted, options)
          }
        } catch (e) {
          console.error('sendCarousel error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    sendButton: {
      async value(jid, text = '', footer = '', buffer, buttons = [], copy = null, urls = [], quoted = null, options = {}) {
        try {
          let img = null, video = null
          if (buffer) {
            try {
              const type = await safeGetFile(buffer).catch(() => null)
              if (type && /^image\//i.test(type.mime)) img = await prepareWAMessageMedia({ image: type.data }, { upload: conn.waUploadToServer })
              else if (type && /^video\//i.test(type.mime)) video = await prepareWAMessageMedia({ video: type.data }, { upload: conn.waUploadToServer })
            } catch (e) { /* ignore */ }
          }
          const dynamicButtons = (buttons || []).map((btn) => ({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: btn[0], id: btn[1] }) }))
          if (copy && (typeof copy === 'string' || typeof copy === 'number')) dynamicButtons.push({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text: 'Copy', copy_code: copy }) })
          if (Array.isArray(urls)) urls.forEach((u) => dynamicButtons.push({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: u[0], url: u[1], merchant_url: u[1] }) }))
          const interactiveMessage = { body: { text: text || '' }, footer: { text: footer || '' }, header: { hasMediaAttachment: !!(img?.imageMessage || video?.videoMessage), imageMessage: img?.imageMessage || null, videoMessage: video?.videoMessage || null }, nativeFlowMessage: { buttons: dynamicButtons.filter(Boolean), messageParamsJson: '' } }
          const msg = proto.Message.fromObject({ viewOnceMessage: { message: { interactiveMessage } } })
          const built = await generateWAMessageFromContent(jid, msg, { userJid: conn.user?.jid, quoted, upload: conn.waUploadToServer })
          await conn.relayMessage(jid, built.message, { messageId: built.key.id })
        } catch (e) {
          console.error('sendButton error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    sendAdonix: {
      async value(jid, medias = [], options = {}) {
        try {
          if (typeof jid !== 'string') throw new TypeError('jid must be string')
          for (const media of medias) {
            if (!media.type || (media.type !== 'image' && media.type !== 'video')) throw new TypeError('media.type must be "image" or "video"')
            if (!media.data || (!media.data.url && !Buffer.isBuffer(media.data))) throw new TypeError('media.data must be object with url or buffer')
          }
          if (medias.length < 2) throw new RangeError('Minimum 2 media')
          const delay = !isNaN(options.delay) ? options.delay : 500
          delete options.delay
          const album = generateWAMessageFromContent(jid, { messageContextInfo: {}, albumMessage: { expectedImageCount: medias.filter(m => m.type === 'image').length, expectedVideoCount: medias.filter(m => m.type === 'video').length, ...(options.quoted ? { contextInfo: { remoteJid: options.quoted.key.remoteJid, fromMe: options.quoted.key.fromMe, stanzaId: options.quoted.key.id, participant: options.quoted.key.participant || options.quoted.key.remoteJid, quotedMessage: options.quoted.message } } : {}) } }, {})
          await conn.relayMessage(album.key.remoteJid, album.message, { messageId: album.key.id })
          for (let i = 0; i < medias.length; i++) {
            const { type, data, caption } = medias[i]
            const message = await generateWAMessage(album.key.remoteJid, { [type]: data, caption: caption || '' }, { upload: conn.waUploadToServer })
            message.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
            await conn.relayMessage(message.key.remoteJid, message.message, { messageId: message.key.id })
            await new Promise((r) => setTimeout(r, delay))
          }
          return album
        } catch (e) {
          console.error('sendAdonix error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendMichi / sendNyanCat: extendedTextMessage with externalAdReply
       ------------------------- */
    sendMichi: {
      async value(jid, text = '', buffer, title, body, url, quoted, options) {
        try {
          if (buffer) {
            try { const t = await safeGetFile(buffer); buffer = t.data } catch { /* keep buffer as-is */ }
          }
          const prep = generateWAMessageFromContent(jid, { extendedTextMessage: { text, contextInfo: { externalAdReply: { title, body, thumbnail: buffer, sourceUrl: url }, mentionedJid: await conn.parseMention(text) } } }, { quoted })
          return conn.relayMessage(jid, prep.message, { messageId: prep.key.id })
        } catch (e) {
          console.error('sendMichi error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    sendNyanCat: {
      async value(jid, text = '', buffer, title, body, url, quoted, options) {
        try {
          if (buffer) {
            try { const t = await safeGetFile(buffer); buffer = t.data } catch { /* keep buffer as-is */ }
          }
          const prep = generateWAMessageFromContent(jid, { extendedTextMessage: { text, contextInfo: { externalAdReply: { title, body, thumbnail: buffer, sourceUrl: url }, mentionedJid: await conn.parseMention(text) } } }, { quoted })
          return conn.relayMessage(jid, prep.message, { messageId: prep.key.id })
        } catch (e) {
          console.error('sendNyanCat error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       sendPayment: request payment message
       ------------------------- */
    sendPayment: {
      async value(jid, amount, text, quoted, options) {
        try {
          conn.relayMessage(jid, {
            requestPaymentMessage: {
              currencyCodeIso4217: 'PEN',
              amount1000: amount,
              requestFrom: null,
              noteMessage: {
                extendedTextMessage: {
                  text,
                  contextInfo: { externalAdReply: { showAdAttribution: true }, mentionedJid: conn.parseMention(text) },
                },
              },
            },
          }, {})
        } catch (e) {
          console.error('sendPayment error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       getFile alias to safeGetFile
       ------------------------- */
    getFile: {
      async value(PATH, saveToFile = false) {
        return safeGetFile(PATH, saveToFile)
      },
      enumerable: true,
    },

    /* -------------------------
       downloadM: download media message to buffer or file
       ------------------------- */
    downloadM: {
      async value(m, type, saveToFile) {
        try {
          if (!m || !(m.url || m.directPath)) return Buffer.alloc(0)
          const stream = await downloadContentFromMessage(m, type)
          let buffer = Buffer.from([])
          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
          if (saveToFile) {
            const { filename } = await safeGetFile(buffer, true)
            return fs.existsSync(filename) ? filename : buffer
          }
          return buffer
        } catch (e) {
          console.error('downloadM error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       cMod: change message metadata (fake sender)
       ------------------------- */
    cMod: {
      value(jid, message, text = '', sender = conn.user?.jid, options = {}) {
        try {
          if (options.mentions && !Array.isArray(options.mentions)) options.mentions = [options.mentions]
          const copy = message.toJSON ? message.toJSON() : JSON.parse(JSON.stringify(message))
          delete copy.message.messageContextInfo
          delete copy.message.senderKeyDistributionMessage
          const mtype = Object.keys(copy.message)[0]
          const msg = copy.message
          const content = msg[mtype]
          if (typeof content === 'string') msg[mtype] = text || content
          else if (content.caption) content.caption = text || content.caption
          else if (content.text) content.text = text || content.text
          if (typeof content !== 'string') {
            msg[mtype] = { ...content, ...options }
            msg[mtype].contextInfo = { ...(content.contextInfo || {}), mentionedJid: options.mentions || content.contextInfo?.mentionedJid || [] }
          }
          if (copy.participant) sender = copy.participant = sender || copy.participant
          else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
          if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
          else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
          copy.key.remoteJid = jid
          copy.key.fromMe = areJidsSameUser(sender, conn.user?.id) || false
          return proto.WebMessageInfo.fromObject(copy)
        } catch (e) {
          console.error('cMod error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       copyNForward: forward preserving context
       ------------------------- */
    copyNForward: {
      async value(jid, message, forwardingScore = true, options = {}) {
        try {
          let vtype
          if (options.readViewOnce && message.message.viewOnceMessage?.message) {
            vtype = Object.keys(message.message.viewOnceMessage.message)[0]
            delete message.message.viewOnceMessage.message[vtype].viewOnce
            message.message = proto.Message.fromObject(JSON.parse(JSON.stringify(message.message.viewOnceMessage.message)))
            message.message[vtype].contextInfo = message.message.viewOnceMessage.contextInfo
          }
          const mtype = Object.keys(message.message)[0]
          let m = generateForwardMessageContent(message, !!forwardingScore)
          const ctype = Object.keys(m)[0]
          if (forwardingScore && typeof forwardingScore === 'number' && forwardingScore > 1) m[ctype].contextInfo.forwardingScore += forwardingScore
          m[ctype].contextInfo = { ...(message.message[mtype].contextInfo || {}), ...(m[ctype].contextInfo || {}) }
          m = generateWAMessageFromContent(jid, m, { ...options, userJid: conn.user?.jid })
          await conn.relayMessage(jid, m.message, { messageId: m.key.id, additionalAttributes: { ...options } })
          return m
        } catch (e) {
          console.error('copyNForward error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       fakeReply: send a reply that appears from another sender
       ------------------------- */
    fakeReply: {
      value(jid, text = '', fakeJid = this.user?.jid, fakeText = '', fakeGroupJid, options) {
        try {
          return conn.reply(jid, text, {
            key: {
              fromMe: areJidsSameUser(fakeJid, conn.user?.id),
              participant: fakeJid,
              ...(fakeGroupJid ? { remoteJid: fakeGroupJid } : {}),
            },
            message: { conversation: fakeText },
            ...options,
          })
        } catch (e) {
          console.error('fakeReply error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    /* -------------------------
       serializeM: convenience wrapper
       ------------------------- */
    serializeM: {
      value(m) {
        return smsg(conn, m)
      },
      enumerable: true,
    },
  })

  if (sock.user?.id) sock.user.jid = sock.decodeJid(sock.user.id)
  store?.bind?.(sock)
  return sock
}

/* -------------------------
   smsg: serialize single message
   ------------------------- */
export function smsg(conn, m, hasParent = false) {
  if (!m) return m
  try {
    const M = baileys?.proto?.WebMessageInfo
    if (M && typeof M.fromObject === 'function') m = M.fromObject(m)
    m.conn = conn
    let protocolMessageKey
    if (m.message) {
      if (m.mtype === 'protocolMessage' && m.msg?.key) {
        protocolMessageKey = m.msg.key
        if (protocolMessageKey.remoteJid === 'status@broadcast') protocolMessageKey.remoteJid = m.chat || ''
        if (!protocolMessageKey.participant || protocolMessageKey.participant === 'status_me') protocolMessageKey.participant = typeof m.sender === 'string' ? m.sender : ''
        const decodedParticipant = conn?.decodeJid?.(protocolMessageKey.participant) || ''
        protocolMessageKey.fromMe = decodedParticipant === (conn?.user?.id || '')
        if (!protocolMessageKey.fromMe && protocolMessageKey.remoteJid === (conn?.user?.id || '')) protocolMessageKey.remoteJid = typeof m.sender === 'string' ? m.sender : ''
      }
      if (m.quoted && !m.quoted.mediaMessage) delete m.quoted.download
    }
    if (!m.mediaMessage) delete m.download
    if (protocolMessageKey && m.mtype === 'protocolMessage') {
      try { conn.ev?.emit?.('message.delete', protocolMessageKey) } catch (e) { console.error('Error emitting message.delete:', e) }
    }
    return m
  } catch (e) {
    console.error('smsg error:', e)
    return m
  }
}

/* -------------------------
   serialize: extend proto.WebMessageInfo.prototype
   ------------------------- */
export function serialize() {
  const protoObj = baileys?.proto?.WebMessageInfo
  if (!protoObj) return

  const MediaType = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage']
  const safeEndsWith = (str, suffix) => typeof str === 'string' && str.endsWith(suffix)
  const safeDecodeJid = (jid, conn) => {
    try {
      if (!jid || typeof jid !== 'string') return ''
      return conn?.decodeJid?.(jid) || jid
    } catch (e) {
      console.error('safeDecodeJid error:', e)
      return ''
    }
  }

  Object.defineProperties(protoObj.prototype, {
    conn: { value: undefined, enumerable: false, writable: true },

    id: {
      get() {
        try { return this.key?.id || '' } catch (e) { console.error('id getter error:', e); return '' }
      },
      enumerable: true,
    },

    chat: {
      get() {
        try {
          const senderKeyDistributionMessage = this.message?.senderKeyDistributionMessage?.groupId
          const rawJid = this.key?.remoteJid || (senderKeyDistributionMessage && senderKeyDistributionMessage !== 'status@broadcast') || ''
          return safeDecodeJid(rawJid, this.conn)
        } catch (e) { console.error('chat getter error:', e); return '' }
      },
      enumerable: true,
    },

    isGroup: {
      get() {
        try { return safeEndsWith(this.chat, '@g.us') } catch (e) { console.error('isGroup getter error:', e); return false }
      },
      enumerable: true,
    },

    sender: {
      get() {
        try { return this.conn?.decodeJid(this.key?.fromMe && this.conn?.user?.id || this.participant || this.key?.participant || this.chat || '') } catch (e) { console.error('sender getter error:', e); return '' }
      },
      enumerable: true,
    },

    fromMe: {
      get() {
        try {
          const userId = this.conn?.user?.jid || ''
          const sender = this.sender || ''
          return this.key?.fromMe || (typeof baileys?.areJidsSameUser === 'function' ? baileys.areJidsSameUser(userId, sender) : false) || false
        } catch (e) { console.error('fromMe getter error:', e); return false }
      },
      enumerable: true,
    },

    mtype: {
      get() {
        try {
          if (!this.message) return ''
          const type = Object.keys(this.message)
          if (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0])) return type[0]
          if (type.length >= 3 && type[1] !== 'messageContextInfo') return type[1]
          return type[type.length - 1]
        } catch (e) { console.error('mtype getter error:', e); return '' }
      },
      enumerable: true,
    },

    msg: {
      get() {
        try { if (!this.message) return null; return this.message[this.mtype] || null } catch (e) { console.error('msg getter error:', e); return null }
      },
      enumerable: true,
    },

    mediaMessage: {
      get() {
        try {
          if (!this.message) return null
          const Message = (this.msg?.url || this.msg?.directPath ? { ...this.message } : baileys?.extractMessageContent?.(this.message)) || null
          if (!Message) return null
          const mtype = Object.keys(Message)[0]
          return MediaType.includes(mtype) ? Message : null
        } catch (e) { console.error('mediaMessage getter error:', e); return null }
      },
      enumerable: true,
    },

    mediaType: {
      get() {
        try { const message = this.mediaMessage; if (!message) return null; return Object.keys(message)[0] } catch (e) { console.error('mediaType getter error:', e); return null }
      },
      enumerable: true,
    },

    quoted: {
      get() {
        try {
          const self = this
          const msg = self.msg
          const contextInfo = msg?.contextInfo
          const quoted = contextInfo?.quotedMessage
          if (!msg || !contextInfo || !quoted) return null
          const type = Object.keys(quoted)[0]
          const q = quoted[type]
          const text = typeof q === 'string' ? q : q?.text || ''

          return Object.defineProperties(JSON.parse(JSON.stringify(typeof q === 'string' ? { text: q } : q || {})), {
            mtype: { get() { return type }, enumerable: true },
            mediaMessage: {
              get() {
                try {
                  const Message = (q?.url || q?.directPath ? { ...quoted } : baileys?.extractMessageContent?.(quoted)) || null
                  if (!Message) return null
                  const mtype = Object.keys(Message)[0]
                  return MediaType.includes(mtype) ? Message : null
                } catch (e) { console.error('quoted.mediaMessage error:', e); return null }
              },
              enumerable: true,
            },
            id: { get() { return contextInfo.stanzaId || '' }, enumerable: true },
            chat: { get() { return contextInfo.remoteJid || self.chat || '' }, enumerable: true },
            sender: {
              get() {
                try {
                  const rawParticipant = contextInfo.participant
                  if (!rawParticipant) {
                    const isFromMe = this.key?.fromMe || (baileys?.areJidsSameUser?.(this.chat, self.conn?.user?.id || '') || false)
                    return isFromMe ? safeDecodeJid(self.conn?.user?.id, self.conn) : this.chat
                  }
                  const parsedJid = safeDecodeJid(rawParticipant, self.conn)
                  return parsedJid
                } catch (e) { console.error('quoted.sender getter error:', e); return '' }
              },
              enumerable: true,
            },
            fromMe: { get() { const sender = this.sender || ''; const userJid = self.conn?.user?.jid || ''; return baileys?.areJidsSameUser?.(sender, userJid) || false }, enumerable: true },
            text: { get() { return text || this.caption || this.contentText || this.selectedDisplayText || '' }, enumerable: true },
            vM: {
              get() {
                return proto.fromObject({
                  key: { fromMe: this.fromMe, remoteJid: this.chat, id: this.id },
                  message: quoted,
                  ...(self.isGroup ? { participant: this.sender } : {}),
                })
              },
              enumerable: true,
            },
            download: {
              value(saveToFile = false) {
                const mtype = this.mediaType
                return self.conn?.downloadM?.(this.mediaMessage?.[mtype], mtype?.replace(/message/i, ''), saveToFile)
              },
              enumerable: true,
              configurable: true,
            },
            reply: {
              value(text, chatId, options) {
                return self.conn?.reply?.(chatId ? chatId : this.chat, text, this.vM, options)
              },
              enumerable: true,
            },
            copy: {
              value() {
                const M = proto
                return smsg(self.conn, M.fromObject(M.toObject(this.vM)))
              },
              enumerable: true,
            },
            forward: {
              value(jid, force = false, options = {}) {
                return self.conn?.sendMessage?.(jid, { forward: this.vM, force, ...options }, { ...options })
              },
              enumerable: true,
            },
            copyNForward: {
              value(jid, forceForward = false, options = {}) {
                return self.conn?.copyNForward?.(jid, this.vM, forceForward, options)
              },
              enumerable: true,
            },
            cMod: {
              value(jid, text = '', sender = this.sender, options = {}) {
                return self.conn?.cMod?.(jid, this.vM, text, sender, options)
              },
              enumerable: true,
            },
            delete: {
              value() {
                return self.conn?.sendMessage?.(this.chat, { delete: this.vM.key })
              },
              enumerable: true,
            },
          })
        } catch (e) {
          console.error('quoted getter error:', e)
          return null
        }
      },
      enumerable: true,
    },

    _text: { value: null, writable: true, enumerable: true },

    text: {
      get() {
        try {
          const msg = this.msg
          const text = (typeof msg === 'string' ? msg : msg?.text) || msg?.caption || msg?.contentText || ''
          if (typeof this._text === 'string') return this._text
          if (typeof text === 'string') return text
          return text?.selectedDisplayText || text?.hydratedTemplate?.hydratedContentText || ''
        } catch (e) { console.error('text getter error:', e); return '' }
      },
      set(str) { this._text = str },
      enumerable: true,
    },

    mentionedJid: {
      get() {
        try {
          const mentioned = this.msg?.contextInfo?.mentionedJid || []
          return mentioned.map((u) => (typeof u === 'object' ? u.jid || u.id || '' : u)).filter(Boolean)
        } catch (e) { console.error('mentionedJid getter error:', e); return [] }
      },
      enumerable: true,
    },

    name: {
      get() {
        try {
          if (!nullish(this.pushName) && this.pushName) return this.pushName
          const sender = this.sender
          return sender ? this.conn?.getName?.(sender) : ''
        } catch (e) { console.error('name getter error:', e); return '' }
      },
      enumerable: true,
    },

    download: {
      value(saveToFile = false) {
        try {
          const mtype = this.mediaType
          return this.conn?.downloadM?.(this.mediaMessage?.[mtype], mtype?.replace(/message/i, ''), saveToFile)
        } catch (e) { console.error('download error:', e); return Promise.reject(e) }
      },
      enumerable: true,
      configurable: true,
    },

    reply: {
      value(text, chatId, options) {
        try { return this.conn?.reply?.(chatId ? chatId : this.chat, text, this, options) } catch (e) { console.error('reply error:', e); return Promise.reject(e) }
      },
      enumerable: true,
    },

    copy: {
      value() {
        try { const M = proto; return smsg(this.conn, M.fromObject(M.toObject(this))) } catch (e) { console.error('copy error:', e); return null }
      },
      enumerable: true,
    },

    forward: {
      value(jid, force = false, options = {}) {
        try { return this.conn?.sendMessage?.(jid, { forward: this, force, ...options }, { ...options }) } catch (e) { console.error('forward error:', e); return Promise.reject(e) }
      },
      enumerable: true,
    },

    copyNForward: {
      value(jid, forceForward = false, options = {}) {
        try { return this.conn?.copyNForward?.(jid, this, forceForward, options) } catch (e) { console.error('copyNForward error:', e); return Promise.reject(e) }
      },
      enumerable: true,
    },

    cMod: {
      value(jid, text = '', sender = this.sender, options = {}) {
        try { return this.conn?.cMod?.(jid, this, text, sender, options) } catch (e) { console.error('cMod error:', e); return Promise.reject(e) }
      },
      enumerable: true,
    },

    getQuotedObj: {
      value() {
        try {
          if (!this.quoted?.id) return null
          const q = proto.fromObject(this.conn?.loadMessage?.(this.quoted.id) || this.quoted.vM || {})
          return smsg(this.conn, q)
        } catch (e) { console.error('getQuotedObj error:', e); return null }
      },
      enumerable: true,
    },

    getQuotedMessage: { get() { return this.getQuotedObj }, enumerable: true },

    delete: {
      value() {
        try { return this.conn?.sendMessage?.(this.chat, { delete: this.key }) } catch (e) { console.error('delete error:', e); return Promise.reject(e) }
      },
      enumerable: true,
    },

    react: {
      value(text) {
        try { return this.conn?.sendMessage?.(this.chat, { react: { text, key: this.key } }) } catch (e) { console.error('react error:', e); return Promise.reject(e) }
      },
      enumerable: true,
    },
  })
}

/* -------------------------
   protoType: optional prototype helpers
   ------------------------- */
export function protoType() {
  if (!Buffer.prototype.toArrayBuffer) {
    Buffer.prototype.toArrayBuffer = function toArrayBufferV2() {
      const ab = new ArrayBuffer(this.length)
      const view = new Uint8Array(ab)
      for (let i = 0; i < this.length; ++i) view[i] = this[i]
      return ab
    }
  }
  if (!ArrayBuffer.prototype.toBuffer) {
    ArrayBuffer.prototype.toBuffer = function toBuffer() { return Buffer.from(new Uint8Array(this)) }
  }
  if (!Uint8Array.prototype.getFileType) {
    Uint8Array.prototype.getFileType = ArrayBuffer.prototype.getFileType = Buffer.prototype.getFileType = async function getFileType() { return await fileTypeFromBuffer(this) }
  }
  if (!String.prototype.isNumber) String.prototype.isNumber = Number.prototype.isNumber = function isNumber() { const int = parseInt(this); return typeof int === 'number' && !isNaN(int) }
  if (!String.prototype.capitalize) String.prototype.capitalize = function capitalize() { return this.charAt(0).toUpperCase() + this.slice(1) }
  if (!String.prototype.capitalizeV2) String.prototype.capitalizeV2 = function capitalizeV2() { const str = this.split(' '); return str.map((v) => v.capitalize()).join(' ') }
  if (!String.prototype.resolveLidToRealJid) {
    String.prototype.resolveLidToRealJid = (function () {
      const lidCache = new Map()
      return async function (groupChatId, conn, maxRetries = 3, retryDelay = 60000) {
        const inputJid = this.toString()
        if (!inputJid.endsWith('@lid') || !groupChatId?.endsWith('@g.us')) return inputJid.includes('@') ? inputJid : `${inputJid}@s.whatsapp.net`
        if (lidCache.has(inputJid)) return lidCache.get(inputJid)
        const lidToFind = inputJid.split('@')[0]
        let attempts = 0
        while (attempts < maxRetries) {
          try {
            const metadata = await conn?.groupMetadata(groupChatId)
            if (!metadata?.participants) throw new Error('No participants')
            for (const participant of metadata.participants) {
              try {
                if (!participant?.jid) continue
                const contactDetails = await conn?.onWhatsApp(participant.jid)
                if (!contactDetails?.[0]?.lid) continue
                const possibleLid = contactDetails[0].lid.split('@')[0]
                if (possibleLid === lidToFind) {
                  lidCache.set(inputJid, participant.jid)
                  return participant.jid
                }
              } catch (e) { continue }
            }
            lidCache.set(inputJid, inputJid)
            return inputJid
          } catch (e) {
            if (++attempts >= maxRetries) { lidCache.set(inputJid, inputJid); return inputJid }
            await new Promise((r) => setTimeout(r, retryDelay))
          }
        }
        return inputJid
      }
    })()
  }
  if (!String.prototype.decodeJid) {
    String.prototype.decodeJid = function decodeJid() {
      if (/:\d+@/gi.test(this)) {
        const decode = baileys?.jidDecode?.(this) || {}
        return ((decode.user && decode.server && decode.user + '@' + decode.server) || this).trim()
      } else return this.trim()
    }
  }
  if (!Number.prototype.toTimeString) {
    Number.prototype.toTimeString = function toTimeString() {
      const seconds = Math.floor((this / 1000) % 60)
      const minutes = Math.floor((this / (60 * 1000)) % 60)
      const hours = Math.floor((this / (60 * 60 * 1000)) % 24)
      const days = Math.floor(this / (24 * 60 * 60 * 1000))
      return ((days ? `${days} day(s) ` : '') + (hours ? `${hours} hour(s) ` : '') + (minutes ? `${minutes} minute(s) ` : '') + (seconds ? `${seconds} second(s)` : '')).trim()
    }
  }
  Number.prototype.getRandom = String.prototype.getRandom = Array.prototype.getRandom = getRandom
}

/* -------------------------
   Exports summary
   ------------------------- */
export default {
  makeWASocket,
  safeGetFile,
  smsg,
  serialize,
  protoType,
}

/* -------------------------
   NOTAS IMPORTANTES
   -------------------------
1) Dependencias: instala las dependencias necesarias:
   npm install @whiskeysockets/baileys file-type node-fetch awesome-phonenumber jimp pino chalk

2) Valores TODO:
   - Ajusta `wm` si usas watermark/footer en mensajes interactivos.
   - Si tu proyecto define `S_WHATSAPP_NET`, `global.rcanal`, `global.lidResolver` u otros, verifica compatibilidad.

3) Inicialización:
   - Al arrancar tu bot, llama:
       import simple from './lib/simple.js'
       simple.serialize()   // para extender proto.WebMessageInfo (opcional)
       simple.protoType()   // para extender prototipos globales (opcional)
     Luego crea la conexión:
       const conn = await simple.makeWASocket({ /* options */ })

4) LIDs:
   - La resolución de `@lid` es asíncrona. Los getters devuelven el `@lid` sin resolver para evitar getters `async`. Usa `String.prototype.resolveLidToRealJid.call(lid, groupId, conn)` para resolver cuando lo necesites.

5) Pruebas:
   - Prueba envío de texto, imagen por URL, archivo local, botones y carrusel en una cuenta de prueba antes de producción.

6) Modularización:
   - Si prefieres, puedo modularizar este archivo en `lib/socket`, `lib/utils`, `lib/proto` para facilitar mantenimiento.
*/
