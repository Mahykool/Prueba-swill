import fetch from 'node-fetch'

let handler = async (m, { conn, usedPrefix, command, args }) => {
try {
if (!args[0]) {
return conn.reply(m.chat,
`> 🎄 *¡NAVIDAD EN APK!* 🎅

> 🎁 *DESCARGADOR APK NAVIDEÑO*

> ❌ *Uso incorrecto*

\`\`\`Debes proporcionar el nombre de la aplicación\`\`\`

> *Ejemplos navideños:*
> • ${usedPrefix + command} whatsapp
> • ${usedPrefix + command} tiktok
> • ${usedPrefix + command} facebook
> • ${usedPrefix + command} instagram
> • ${usedPrefix + command} spotify

> 🎄 *¡Itsuki Nakano V3 - Tu asistente navideño!* 🎅`, m)
}

const appName = args.join(' ').toLowerCase()    

// Mensaje de búsqueda
await conn.reply(m.chat,    
`> 🎄 *¡BUSCANDO APLICACIÓN!* 🎅

> 🔍 *Buscando aplicación navideña...*

> 📱 *Nombre:* ${appName}
> ⚡ *Estado:* Consultando repositorios
> 💎 *Tipo:* Descarga Navideña

> 🎅 *Itsuki V3 está trabajando en ello...* 📱`,    
m    
)    

// ✅ API CORREGIDA
const apiUrl = `https://mayapi.ooguy.com/apk?query=${encodeURIComponent(appName)}&apikey=may-f53d1d49`    
const response = await fetch(apiUrl, {    
timeout: 30000    
})    

if (!response.ok) {    
throw new Error(`Error en la API: ${response.status}`)    
}    

const data = await response.json()    
console.log('🎁 Respuesta de API APK:', data)    

if (!data.status || !data.result) {    
throw new Error('No se encontró la aplicación solicitada')    
}    

const appData = data.result    
const downloadUrl = appData.url    
const appTitle = appData.title || appName    
const appVersion = appData.version || 'Última versión navideña'    
const appSize = appData.size || 'Tamaño festivo'    
const appDeveloper = appData.developer || 'Santa Claus Workshop'    

// Intentar obtener imagen del APK
let appImage = null
try {
// Buscar imagen en los datos de la API
if (appData.icon) {
appImage = appData.icon
} else if (appData.image) {
appImage = appData.image
} else if (appData.screenshot) {
appImage = appData.screenshot[0]
}
} catch (imgError) {
console.log('❌ No se pudo obtener imagen del APK')
}

if (!downloadUrl) {    
throw new Error('No se encontró enlace de descarga')    
}    

// Mensaje de aplicación encontrada con imagen si está disponible
if (appImage) {
await conn.sendMessage(m.chat, {
image: { url: appImage },
caption: `> 🎄 *¡APP ENCONTRADA!* 🎅

> ✅ *Aplicación encontrada*

> 📱 *Nombre:* ${appTitle}
> 🔄 *Versión:* ${appVersion}
> 💾 *Tamaño:* ${appSize}
> 👨‍💻 *Desarrollador:* ${appDeveloper}
> 💎 *Estado:* Preparando descarga

> 🎅 *Itsuki V3 prepara tu APK...* ⬇️`
}, { quoted: m })
} else {
await conn.reply(m.chat,    
`> 🎄 *¡APP ENCONTRADA!* 🎅

> ✅ *Aplicación encontrada*

> 📱 *Nombre:* ${appTitle}
> 🔄 *Versión:* ${appVersion}
> 💾 *Tamaño:* ${appSize}
> 👨‍💻 *Desarrollador:* ${appDeveloper}
> 💎 *Estado:* Preparando descarga

> 🎅 *Itsuki V3 prepara tu APK...* ⬇️`,    
m    
)    
}

// Enviar el archivo APK    
await conn.sendMessage(m.chat, {    
document: { url: downloadUrl },    
mimetype: 'application/vnd.android.package-archive',    
fileName: `${appTitle.replace(/\s+/g, '_')}_navidad.apk`,    
caption: 
`> 🎄 *¡APK DESCARGADO!* 🎅

> ✅ *Descarga completada*

> 📱 *Aplicación:* ${appTitle}
> ⭐ *Versión:* ${appVersion}
> 💾 *Tamaño:* ${appSize}
> 👨‍💻 *Desarrollador:* ${appDeveloper}
> 💎 *Tipo:* Descarga Navideña

> ⚠️ *Instala bajo tu propia responsabilidad*
> 🎅 *¡Disfruta tu aplicación navideña!*
> 🎄 *¡Feliz Navidad con Itsuki Nakano V3!*`    
}, { quoted: m })    

await m.react('✅')

} catch (error) {
console.error('❌ Error en descarga APK:', error)

await conn.reply(m.chat,    
`> 🎄 *¡ERROR DE DESCARGA!* 🎅

> ❌ *Error en la descarga*

> 📝 *Detalles:* ${error.message}

> 🔍 *Posibles causas:*
> • Nombre de aplicación incorrecto
> • Aplicación no disponible
> • Error del servidor
> • Intenta con otro nombre

> 🎅 *Itsuki lo intentará de nuevo...*
> 🎄 *Por favor, intenta con otro nombre*`,    
m    
)    

await m.react('❌')

}
}

handler.help = ['apk']
handler.tags = ['downloader']
handler.command = ['apk', 'apkdl', 'descargarapk']
handler.register = false

export default handler