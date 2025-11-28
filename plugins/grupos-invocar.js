/*  
✦ LATAM ✦ Swill — TagAll Profesional  
✦ Creado por Mahykol (ROOWNER)  
✦ Estilo 🌸  
*/

const handler = async (m, { isOwner, isAdmin, conn, text, participants, args, command, usedPrefix }) => {
  // Evitar ejecución accidental con prefijo "a"
  if (usedPrefix === 'a' || usedPrefix === 'A') return;

  // Emoji personalizado por chat
  const customEmoji = global.db.data.chats[m.chat]?.customEmoji || '🍓';
  m.react(customEmoji);

  // ✅ Permisos Swill: mods, staff, admins, owner
  const isMod = global.mods?.includes(m.sender)
  const isStaff = global.staff?.includes(m.sender)
  const isPower = isOwner || isAdmin || isMod || isStaff

  if (!isPower) {
    global.dfail('admin', m, conn)
    return
  }

  // Frases tsundere aleatorias
  const frases = [
    '¡Ya están todos etiquetados, más les vale leerlo o me enojo! 😡',
    '¡No ignoren esto, tontos! Lo digo en serio~ 💢',
    '¡Hmph! Espero que por lo menos pongan atención esta vez. 🙄',
    '¡Ya está! Si no lo leen, no es mi problema. 💖',
    '¿De verdad tengo que repetirlo? ¡Qué fastidio! 😤',
    'Lean bien, ¿ok? No pienso volver a hacer esto por gusto. 😒'
  ];
  const fraseFinal = frases[Math.floor(Math.random() * frases.length)];

  // Mensaje personalizado
  const pesan = args.join` `;
  const mensaje = pesan
    ? `「 🌸 *Itsuki Nakano informa* 🌸 」\n✦ *${pesan}*`
    : `😡 ¡Baka! Presten atención todos de una vez, no me hagan repetirlo. 💢`;

  // Marco decorado estilo Swill
  let teks = `
╭━━━〔 🌸 *INVOCACIÓN GENERAL* 🌸 〕━━━⬣
┃ 🌟 *Miembros totales:* ${participants.length} 🗣️
┃ 💌 ${mensaje}
╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━〔 📌 *ETIQUETADOS* 📌 〕━━━⬣
`;

  for (const mem of participants) {
    teks += `┃ ${customEmoji} @${mem.id.split('@')[0]}\n`;
  }

  teks += `╰━━━━━━━━━━━━━━━━━━━━⬣

╭━━━〔 🪷 *SWILL - AI* 🪷 〕━━━⬣
┃ "${fraseFinal}"
╰━━━━━━━━━━━━━━━━━━━━⬣
`;

  // Imagen aleatoria de Itsuki
  const imagenes = [
    'https://files.catbox.moe/fqflxj.jpg',
    'https://files.catbox.moe/3j6x1y.jpg',
    'https://files.catbox.moe/8v2j7n.jpg'
  ];
  const imgUrl = imagenes[Math.floor(Math.random() * imagenes.length)];

  await conn.sendMessage(m.chat, {
    image: { url: imgUrl },
    caption: teks,
    mentions: participants.map((a) => a.id)
  });
};

handler.help = ['invocar', 'todos', 'tagall'];
handler.tags = ['group'];
handler.command = ['todos', 'invocar', 'tagall'];
handler.admin = false; // ✅ Ya no depende solo de admin
handler.group = true;

export default handler;
