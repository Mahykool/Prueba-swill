import fetch from 'node-fetch'

let handler = async (m, { conn, usedPrefix, args, command }) => {
  try {
    if (!args[0]) {
      return conn.reply(m.chat,
        `> 🎄 *¡NAVIDAD EN INSTAGRAM!* 🎅

> 🎁 *DESCARGADOR INSTAGRAM NAVIDEÑO*

> ❌ *Uso incorrecto*

\`\`\`Debes proporcionar un enlace de Instagram\`\`\`

> *Ejemplos navideños:*
> • ${usedPrefix + command} https://www.instagram.com/p/xxxxx
> • ${usedPrefix}ig https://instagram.com/reel/xxxxx

> *Comandos disponibles:*
> • ${usedPrefix}ig <url> - Descargar video/imagen
> • ${usedPrefix}igaudio <url> - Extraer audio

> 🎅 *¡Itsuki Nakano V3 - Tu asistente navideño!* 🎄`, m)
    }

    const url = args[0]
    if (!url.match(/instagram\.com/)) {
      return conn.reply(m.chat,
        `> 🎄 *¡ENLACE INVÁLIDO!* 🎅

> ❌ *URL no válida*

\`\`\`Por favor envía un enlace de Instagram válido\`\`\`

> *Ejemplo correcto:*
> https://www.instagram.com/p/xxxxx
> https://instagram.com/reel/xxxxx

> 🎅 *¡Itsuki V3 necesita un enlace válido!* 🎄`, m)
    }

    await m.react('🎁')
    await m.react('🕑')

    const api1 = `https://mayapi.ooguy.com/instagram?url=${encodeURIComponent(url)}&apikey=may-f53d1d49`
    const api2 = `https://apiadonix.kozow.com/download/instagram?apikey=${global.apikey}&url=${encodeURIComponent(url)}`

    let mediaUrl, mediaTitle, mediaType, apiUsada = 'May API'

    try {
      const res = await fetch(api1, { timeout: 30000 })
      if (!res.ok) throw new Error('Error en API principal')
      const data = await res.json()

      if (data.result?.url) {
        mediaUrl = data.result.url
        mediaTitle = data.result.title || 'Contenido de Instagram'
        mediaType = data.result.type || 'video'
      } else if (data.url) {
        mediaUrl = data.url
        mediaTitle = data.title || 'Contenido de Instagram'
        mediaType = data.type || 'video'
      } else if (data.data?.url) {
        mediaUrl = data.data.url
        mediaTitle = data.data.title || 'Contenido de Instagram'
        mediaType = data.data.type || 'video'
      }
    } catch {
      apiUsada = 'API Adonix'
      const res2 = await fetch(api2, { timeout: 30000 })
      if (!res2.ok) throw new Error('Error en API de respaldo')
      const data2 = await res2.json()

      const adonixData = Array.isArray(data2.data) ? data2.data[0] : data2.data
      mediaUrl = adonixData?.url
      mediaTitle = 'Contenido de Instagram'
      mediaType = mediaUrl?.includes('.mp4') ? 'video' : 'image'
    }

    if (!mediaUrl) throw new Error('No se encontró contenido válido')

    const isVideo = mediaType === 'video' || mediaUrl.includes('.mp4')
    const isAudioCommand = command.toLowerCase().includes('audio')

    if (isAudioCommand && isVideo) {
      // Solo audio - SIN MENSAJE
      await conn.sendMessage(m.chat, {
        audio: { url: mediaUrl },
        mimetype: 'audio/mpeg',
        fileName: `audio_instagram.mp3`
      }, { quoted: m })
    } else if (isVideo) {
      // Video con mensaje navideño
      await conn.sendMessage(m.chat, {
        video: { url: mediaUrl },
        caption: `> 🎄 *¡VIDEO DESCARGADO!* 🎅

> 📹 *Video de Instagram*

> 📝 *Título:* ${mediaTitle}
> 🎬 *Formato:* MP4
> 🎁 *Calidad:* Original

> 🎅 *¡Itsuki V3 descargó tu video!*
> 🎄 *¡Feliz Navidad con Itsuki Nakano V3!* 🎁`
      }, { quoted: m })
    } else {
      // Imagen con mensaje navideño
      await conn.sendMessage(m.chat, {
        image: { url: mediaUrl },
        caption: `> 🎄 *¡IMAGEN DESCARGADA!* 🎅

> 🖼️ *Imagen de Instagram*

> 📝 *Título:* ${mediaTitle}
> 🎨 *Formato:* JPEG
> 🎁 *Calidad:* Original

> 🎅 *¡Itsuki V3 descargó tu imagen!*
> 🎄 *¡Feliz Navidad con Itsuki Nakano V3!* 🎁`
      }, { quoted: m })
    }

    await m.react('✅')

  } catch (error) {
    console.error('❌ Error en descarga Instagram:', error)
    await conn.reply(m.chat,
      `> 🎄 *¡ERROR EN DESCARGA!* 🎅

> ❌ *Error en la descarga*

> 📝 *Detalles:* ${error.message}

> 🔍 *Posibles soluciones:*
> • Enlace incorrecto o privado
> • Contenido restringido o eliminado
> • Intenta con otro enlace
> • Espera un momento y vuelve a intentar

> 🎅 *Itsuki V3 lo intentará de nuevo...*
> 🎄 *¡No te rindas!* 🎁`, m)
    await m.react('❌')
  }
}

handler.help = ['ig', 'igaudio']
handler.tags = ['downloader']
handler.command = ['ig', 'igaudio']
handler.register = false

export default handler