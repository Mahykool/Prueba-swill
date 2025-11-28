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

const wm = typeof global?.wm !== 'undefined' ? global.wm : 'MiBotSwill • 2025'
const S_WHATSAPP_NET = typeof global?.S_WHATSAPP_NET !== 'undefined' ? global.S_WHATSAPP_NET : 's.whatsapp.net'

const baileys = (baileysImport && baileysImport.default) ? baileysImport.default : baileysImport

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

function nullish(v) {
  return v === null || v === undefined
}

function getRandom() {
  if (Array.isArray(this) || this instanceof String) return this[Math.floor(Math.random() * this.length)]
  return Math.floor(Math.random() * this)
}

function chalkSafe(level) {
  try {
    const chalk = require('chalk')
    switch (level) {
      case 'INFO': return chalk.bold.bgRgb(51, 204, 51)('INFO ')
      case 'ERROR': return chalk.bold.bgRgb(247, 38, 33)('ERROR ')
      case 'WARN': return chalk.bold.bgRgb(255, 153, 0)('WARNING ')
      case 'DEBUG': return chalk.bold.bgRgb(66, 167, 245)('DEBUG ')
      default: return chalk.grey(level)
    }
  } catch {
    return level
  }
}

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

    reply: {
      value(jid, text = '', quoted, options = {}) {
        return Buffer.isBuffer(text)
          ? conn.sendFile(jid, text, 'file', '', quoted, false, options)
          : conn.sendMessage(jid, { ...options, text }, { quoted, ...options })
      },
      enumerable: true,
    },

    sendContact: {
      async value(jid, data, quoted, options = {}) {
        try {
          if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
          const contacts = []
          for (let [number, name] of data) {
            number = number.replace(/[^0-9]/g, '')
            const njid = number + '@s.whatsapp.net'
            const biz = (await conn.getBusinessProfile(njid).catch(() => null)) || {}
            const vcard = `BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}
${biz.description ? `X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || conn.getName(njid) || name).replace(/\n/, '\\n')}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, '\\n')}` : ''}
END:VCARD`.trim()
            contacts.push({ vcard, displayName: name })
          }
          return await conn.sendMessage(jid, {
            ...options,
            contacts: {
              ...options,
              displayName: (contacts.length >= 2 ? `${contacts.length} kontak` : contacts[0].displayName) || null,
              contacts,
            },
          }, { quoted })
        } catch (e) {
          console.error('sendContact error:', e)
          throw e
        }
      },
      enumerable: true,
    },
        sendPayment: {
      async value(jid, amount, text, quoted, options) {
        try {
          return conn.relayMessage(jid, {
            requestPaymentMessage: {
              currencyCodeIso4217: 'PEN',
              amount1000: amount,
              requestFrom: null,
              noteMessage: {
                extendedTextMessage: {
                  text,
                  contextInfo: {
                    externalAdReply: { showAdAttribution: true },
                    mentionedJid: conn.parseMention(text)
                  }
                }
              }
            }
          }, {})
        } catch (e) {
          console.error('sendPayment error:', e)
          throw e
        }
      },
      enumerable: true,
    },

    getFile: {
      async value(PATH, saveToFile = false) {
        return safeGetFile(PATH, saveToFile)
      },
      enumerable: true,
    },

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

    cMod: {
      value(jid, message, text = '', sender = conn.user?.jid, options = {}) {
        try {
          if (options.mentions && !Array.isArray(options.mentions))
            options.mentions = [options.mentions]

          const copy = message.toJSON
            ? message.toJSON()
            : JSON.parse(JSON.stringify(message))

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
            msg[mtype].contextInfo = {
              ...(content.contextInfo || {}),
              mentionedJid: options.mentions || content.contextInfo?.mentionedJid || []
            }
          }

          if (copy.participant) sender = copy.participant = sender || copy.participant
          else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant

          if (copy.key.remoteJid.includes('@s.whatsapp.net'))
            sender = sender || copy.key.remoteJid
          else if (copy.key.remoteJid.includes('@broadcast'))
            sender = sender || copy.key.remoteJid

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

    copyNForward: {
      async value(jid, message, forwardingScore = true, options = {}) {
        try {
          let vtype
          if (options.readViewOnce && message.message.viewOnceMessage?.message) {
            vtype = Object.keys(message.message.viewOnceMessage.message)[0]
            delete message.message.viewOnceMessage.message[vtype].viewOnce
            message.message = proto.Message.fromObject(
              JSON.parse(JSON.stringify(message.message.viewOnceMessage.message))
            )
            message.message[vtype].contextInfo =
              message.message.viewOnceMessage.contextInfo
          }

          const mtype = Object.keys(message.message)[0]
          let m = generateForwardMessageContent(message, !!forwardingScore)
          const ctype = Object.keys(m)[0]

          if (forwardingScore && typeof forwardingScore === 'number' && forwardingScore > 1)
            m[ctype].contextInfo.forwardingScore += forwardingScore

          m[ctype].contextInfo = {
            ...(message.message[mtype].contextInfo || {}),
            ...(m[ctype].contextInfo || {})
          }

          m = generateWAMessageFromContent(jid, m, {
            ...options,
            userJid: conn.user?.jid
          })

          await conn.relayMessage(jid, m.message, {
            messageId: m.key.id,
            additionalAttributes: { ...options }
          })

          return m
        } catch (e) {
          console.error('copyNForward error:', e)
          throw e
        }
      },
      enumerable: true,
    },

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

    serializeM: {
      value(m) {
        return smsg(conn, m)
      },
      enumerable: true,
    },
    /* -------------------------    smsg: serialize single message    ------------------------- */
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
        if (protocolMessageKey.remoteJid === 'status@broadcast')
          protocolMessageKey.remoteJid = m.chat || ''

        if (!protocolMessageKey.participant || protocolMessageKey.participant === 'status_me')
          protocolMessageKey.participant = typeof m.sender === 'string' ? m.sender : ''

        const decodedParticipant = conn?.decodeJid?.(protocolMessageKey.participant) || ''
        protocolMessageKey.fromMe = decodedParticipant === (conn?.user?.id || '')

        if (!protocolMessageKey.fromMe && protocolMessageKey.remoteJid === (conn?.user?.id || ''))
          protocolMessageKey.remoteJid = typeof m.sender === 'string' ? m.sender : ''
      }

      if (m.quoted && !m.quoted.mediaMessage) delete m.quoted.download
    }

    if (!m.mediaMessage) delete m.download

    if (protocolMessageKey && m.mtype === 'protocolMessage') {
      try {
        conn.ev?.emit?.('message.delete', protocolMessageKey)
      } catch (e) {
        console.error('Error emitting message.delete:', e)
      }
    }

    return m
  } catch (e) {
    console.error('smsg error:', e)
    return m
  }
}

/* -------------------------    serialize: extend proto.WebMessageInfo.prototype    ------------------------- */
export function serialize() {
  const protoObj = baileys?.proto?.WebMessageInfo
  if (!protoObj) return

  const MediaType = [
    'imageMessage',
    'videoMessage',
    'audioMessage',
    'stickerMessage',
    'documentMessage'
  ]

  const safeEndsWith = (str, suffix) =>
    typeof str === 'string' && str.endsWith(suffix)

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
        try { return this.key?.id || '' }
        catch (e) { console.error('id getter error:', e); return '' }
      },
      enumerable: true,
    },

    chat: {
      get() {
        try {
          const senderKeyDistributionMessage =
            this.message?.senderKeyDistributionMessage?.groupId

          const rawJid =
            this.key?.remoteJid ||
            (senderKeyDistributionMessage &&
              senderKeyDistributionMessage !== 'status@broadcast') ||
            ''

          return safeDecodeJid(rawJid, this.conn)
        } catch (e) {
          console.error('chat getter error:', e)
          return ''
        }
      },
      enumerable: true,
    },

    isGroup: {
      get() {
        try { return safeEndsWith(this.chat, '@g.us') }
        catch (e) { console.error('isGroup getter error:', e); return false }
      },
      enumerable: true,
    },

    sender: {
      get() {
        try {
          return this.conn?.decodeJid(
            this.key?.fromMe && this.conn?.user?.id ||
            this.participant ||
            this.key?.participant ||
            this.chat ||
            ''
          )
        } catch (e) {
          console.error('sender getter error:', e)
          return ''
        }
      },
      enumerable: true,
    },

    fromMe: {
      get() {
        try {
          const userId = this.conn?.user?.jid || ''
          const sender = this.sender || ''
          return (
            this.key?.fromMe ||
            (typeof baileys?.areJidsSameUser === 'function'
              ? baileys.areJidsSameUser(userId, sender)
              : false)
          )
        } catch (e) {
          console.error('fromMe getter error:', e)
          return false
        }
      },
      enumerable: true,
    },

    mtype: {
      get() {
        try {
          if (!this.message) return ''
          const type = Object.keys(this.message)
          if (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]))
            return type[0]
          if (type.length >= 3 && type[1] !== 'messageContextInfo')
            return type[1]
          return type[type.length - 1]
        } catch (e) {
          console.error('mtype getter error:', e)
          return ''
        }
      },
      enumerable: true,
    },

    msg: {
      get() {
        try {
          if (!this.message) return null
          return this.message[this.mtype] || null
        } catch (e) {
          console.error('msg getter error:', e)
          return null
        }
      },
      enumerable: true,
    },

    mediaMessage: {
      get() {
        try {
          if (!this.message) return null
          const Message =
            (this.msg?.url || this.msg?.directPath
              ? { ...this.message }
              : baileys?.extractMessageContent?.(this.message)) || null
          if (!Message) return null
          const mtype = Object.keys(Message)[0]
          return MediaType.includes(mtype) ? Message : null
        } catch (e) {
          console.error('mediaMessage getter error:', e)
          return null
        }
      },
      enumerable: true,
    },

    mediaType: {
      get() {
        try {
          const message = this.mediaMessage
          if (!message) return null
          return Object.keys(message)[0]
        } catch (e) {
          console.error('mediaType getter error:', e)
          return null
        }
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

          return Object.defineProperties(
            JSON.parse(JSON.stringify(typeof q === 'string' ? { text: q } : q || {})),
            {
              mtype: { get() { return type }, enumerable: true },

              mediaMessage: {
                get() {
                  try {
                    const Message =
                      (q?.url || q?.directPath
                        ? { ...quoted }
                        : baileys?.extractMessageContent?.(quoted)) || null
                    if (!Message) return null
                    const mtype = Object.keys(Message)[0]
                    return ['imageMessage','videoMessage','audioMessage','stickerMessage','documentMessage']
                      .includes(mtype)
                      ? Message
                      : null
                  } catch (e) {
                    console.error('quoted.mediaMessage error:', e)
                    return null
                  }
                },
                enumerable: true,
              },

              id: { get() { return contextInfo.stanzaId || '' }, enumerable: true },
              chat: { get() { return contextInfo.remoteJid || self.chat || '' }, enumerable: true },

              sender: {
                get() {
                  try {
                    const raw = contextInfo.participant
                    if (!raw) return self.sender
                    return self.conn?.decodeJid(raw)
                  } catch (e) {
                    console.error('quoted.sender error:', e)
                    return ''
                  }
                },
                enumerable: true,
              },

              fromMe: {
                get() {
                  const sender = this.sender || ''
                  const userJid = self.conn?.user?.jid || ''
                  return baileys?.areJidsSameUser?.(sender, userJid) || false
                },
                enumerable: true,
              },

              text: {
                get() {
                  return (
                    text ||
                    this.caption ||
                    this.contentText ||
                    this.selectedDisplayText ||
                    ''
                  )
                },
                enumerable: true,
              },

              vM: {
                get() {
                  return proto.WebMessageInfo.fromObject({
                    key: {
                      fromMe: this.fromMe,
                      remoteJid: this.chat,
                      id: this.id,
                    },
                    message: quoted,
                    ...(self.isGroup ? { participant: this.sender } : {}),
                  })
                },
                enumerable: true,
              },

              download: {
                value(saveToFile = false) {
                  const mtype = this.mediaType
                  return self.conn?.downloadM?.(
                    this.mediaMessage?.[mtype],
                    mtype?.replace(/message/i, ''),
                    saveToFile
                  )
                },
                enumerable: true,
              },

              reply: {
                value(text, chatId, options) {
                  return self.conn?.reply?.(
                    chatId ? chatId : this.chat,
                    text,
                    this.vM,
                    options
                  )
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
                  return self.conn?.sendMessage?.(
                    jid,
                    { forward: this.vM, force, ...options },
                    { ...options }
                  )
                },
                enumerable: true,
              },

              copyNForward: {
                value(jid, forceForward = false, options = {}) {
                  return self.conn?.copyNForward?.(
                    jid,
                    this.vM,
                    forceForward,
                    options
                  )
                },
                enumerable: true,
              },

              cMod: {
                value(jid, text = '', sender = this.sender, options = {}) {
                  return self.conn?.cMod?.(
                    jid,
                    this.vM,
                    text,
                    sender,
                    options
                  )
                },
                enumerable: true,
              },

              delete: {
                value() {
                  return self.conn?.sendMessage?.(this.chat, {
                    delete: this.vM.key,
                  })
                },
                enumerable: true,
              },

              react: {
                value(text) {
                  return self.conn?.sendMessage?.(this.chat, {
                    react: { text, key: this.vM.key },
                  })
                },
                enumerable: true,
              },
            }
          )
        } catch (e) {
          console.error('quoted getter error:', e)
          return null
        }
      },
      enumerable: true,
    },

    download: {
      value(saveToFile = false) {
        try {
          const mtype = this.mediaType
          return this.conn?.downloadM?.(
            this.mediaMessage?.[mtype],
            mtype?.replace(/message/i, ''),
            saveToFile
          )
        } catch (e) {
          console.error('download error:', e)
          return Promise.reject(e)
        }
      },
      enumerable: true,
    },
  })
}

/* -------------------------    protoType: optional prototype helpers    ------------------------- */
export function protoType() {
  if (!Buffer.prototype.toArrayBuffer) {
    Buffer.prototype.toArrayBuffer = function () {
      const ab = new ArrayBuffer(this.length)
      const view = new Uint8Array(ab)
      for (let i = 0; i < this.length; ++i) view[i] = this[i]
      return ab
    }
  }

  if (!ArrayBuffer.prototype.toBuffer) {
    ArrayBuffer.prototype.toBuffer = function () {
      return Buffer.from(new Uint8Array(this))
    }
  }

  if (!Uint8Array.prototype.getFileType) {
    Uint8Array.prototype.getFileType = Buffer.prototype.getFileType = async function () {
      return await fileTypeFromBuffer(this)
    }
  }

  if (!String.prototype.isNumber) {
    String.prototype.isNumber = function () {
      const int = parseInt(this)
      return typeof int === 'number' && !isNaN(int)
    }
  }

  if (!String.prototype.capitalize) {
    String.prototype.capitalize = function () {
      return this.charAt(0).toUpperCase() + this.slice(1)
    }
  }

  if (!String.prototype.capitalizeV2) {
    String.prototype.capitalizeV2 = function () {
      return this.split(' ').map((v) => v.capitalize()).join(' ')
    }
  }

  Number.prototype.getRandom =
    String.prototype.getRandom =
    Array.prototype.getRandom =
      getRandom
}

/* -------------------------    Export principal    ------------------------- */
export default {
  makeWASocket,
  safeGetFile,
  smsg,
  serialize,
  protoType,
}
