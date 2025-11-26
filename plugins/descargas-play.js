import fetch from 'node-fetch'
import yts from 'yt-search'

let handler = async (m, { conn, text, usedPrefix }) => {
  if (!text) {
    return conn.reply(m.chat, 
`> 🎄 *¡NAVIDAD EN YOUTUBE!* 🎅

> 🎁 *DESCARGADOR DE AUDIO NAVIDEÑO*

> ❌ *Uso incorrecto*

> \`\`\`Debes proporcionar el nombre de la canción\`\`\`

> *Ejemplos navideños:*
> • ${usedPrefix}play villancicos navideños
> • ${usedPrefix}play canciones de navidad
> • ${usedPrefix}play música navideña

> 🎅 *¡Itsuki Nakano V3 descargará tu audio!* 🎄`, m)
  }

  try {
    await m.react('🎁')
    await m.react('🕑')

    const search = await yts(text)
    if (!search.videos.length) throw new Error('No encontré resultados para tu búsqueda.')

    const video = search.videos[0]
    const { title, url, thumbnail } = video

    let thumbBuffer = null
    if (thumbnail) {
      try {
        const resp = await fetch(thumbnail)
        thumbBuffer = Buffer.from(await resp.arrayBuffer())
      } catch (err) {
        console.log('🎄 No se pudo obtener la miniatura:', err.message)
      }
    }

    // ===== APIs para audio MP3 =====
    const fuentes = [
      { api: 'Adonix', endpoint: `https://api-adonix.ultraplus.click/download/ytmp3?apikey=${global.apikey}&url=${encodeURIComponent(url)}`, extractor: res => res?.data?.url },
      { api: 'MayAPI', endpoint: `https://mayapi.ooguy.com/ytdl?url=${encodeURIComponent(url)}&type=mp3&apikey=${global.APIKeys['https://mayapi.ooguy.com']}`, extractor: res => res.result.url }
    ]

    let audioUrl, apiUsada, exito = false

    for (let fuente of fuentes) {
      try {
        const response = await fetch(fuente.endpoint)
        if (!response.ok) continue
        const data = await response.json()
        const link = fuente.extractor(data)
        if (link) {
          audioUrl = link
          apiUsada = fuente.api
          exito = true
          break
        }
      } catch (err) {
        console.log(`🎄 Error con ${fuente.api}:`, err.message)
      }
    }

    if (!exito) {
      await m.react('❌')
      return conn.reply(m.chat, 
`> 🎄 *¡ERROR EN DESCARGA!* 🎅

> ❌ *No se pudo obtener el audio*

> 🔍 *Posibles causas:*
> • Las APIs están temporalmente fuera de servicio
> • El contenido podría estar restringido
> • Problemas de conexión

> 🎅 *Itsuki V3 lo intentará de nuevo...*
> 🎄 *¡Intenta más tarde!* 🎁`, m)
    }

    await conn.sendMessage(
      m.chat,
      {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        ptt: false,
        jpegThumbnail: thumbBuffer,
        fileName: `audio_navidad.mp3`
      },
      { quoted: m }
    )

    await m.react('✅')

  } catch (e) {
    console.error('🎄 Error en play:', e)
    await conn.reply(m.chat, 
`> 🎄 *¡ERROR EN DESCARGA!* 🎅

> ❌ *Error al procesar la solicitud*

> 📝 *Detalles:* ${e.message}

> 🔍 *Sugerencias:*
> • Verifica el nombre de la canción
> • Intenta con otro término de búsqueda
> • Espera un momento y vuelve a intentar

> 🎅 *Itsuki V3 lo intentará de nuevo...*
> 🎄 *¡No te rindas!* 🎁`, m)
    await m.react('❌')
  }
}

handler.help = ['play']
handler.tags = ['downloader']
handler.command = ['play']
handler.group = true
// handler.register = false

export default handler