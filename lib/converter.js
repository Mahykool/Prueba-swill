// lib/converter.js
import { promises as fsp, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TMP_DIR = join(__dirname, '../tmp')

// Asegura que exista el directorio tmp
if (!existsSync(TMP_DIR)) {
  try { mkdirSync(TMP_DIR, { recursive: true }) } catch (e) { /* noop */ }
}

function runFfmpeg(inputPath, args = [], outputPath) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-y', '-i', inputPath, ...args, outputPath], { stdio: ['ignore', 'pipe', 'pipe'] })

    let stderr = ''
    ff.stderr.on('data', (c) => { stderr += c.toString() })

    ff.on('error', (err) => reject(err))
    ff.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}: ${stderr}`))
      resolve()
    })
  })
}

async function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  const ts = Date.now()
  const safeExt = (ext || 'bin').replace(/[^a-z0-9]/gi, '')
  const outExt = (ext2 || 'out').replace(/[^a-z0-9]/gi, '')
  const inPath = join(TMP_DIR, `${ts}.${safeExt}`)
  const outPath = `${inPath}.${outExt}`

  try {
    await fsp.writeFile(inPath, buffer)
    await runFfmpeg(inPath, args, outPath)
    const data = await fsp.readFile(outPath)
    return {
      data,
      filename: outPath,
      async delete() {
        try { await fsp.unlink(outPath) } catch {}
      }
    }
  } catch (e) {
    // intenta limpiar archivos temporales si existen
    try { await fsp.unlink(inPath) } catch {}
    try { await fsp.unlink(outPath) } catch {}
    throw e
  } finally {
    // intenta eliminar el archivo de entrada (no bloqueante)
    try { await fsp.unlink(inPath) } catch {}
  }
}

async function toPTT(buffer, ext = 'tmp') {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on'
  ], ext, 'ogg')
}

async function toAudio(buffer, ext = 'tmp') {
  return ffmpeg(buffer, [
    '-vn',
    '-c:a', 'libopus',
    '-b:a', '128k',
    '-vbr', 'on',
    '-compression_level', '10'
  ], ext, 'opus')
}

async function toVideo(buffer, ext = 'tmp') {
  return ffmpeg(buffer, [
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-ab', '128k',
    '-ar', '44100',
    '-crf', '32',
    '-preset', 'slow'
  ], ext, 'mp4')
}

export { toAudio, toPTT, toVideo, ffmpeg }
export default { toAudio, toPTT, toVideo, ffmpeg }
