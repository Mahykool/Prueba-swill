// lib/roles-config.js
// ✦ Configuración de roles LATAM ✦ Swill
// Diseñado por Mahykol ✦

export const ROLES = {
  roowner: {
    label: 'Root Owner',
    color: '#ff0055',
    permissions: ['*']
  },
  owner: {
    label: 'Owner',
    color: '#ff8800',
    permissions: ['ban', 'kick', 'promote', 'config', 'mod']
  },
  mod: {
    label: 'Moderator',
    color: '#00ccff',
    permissions: ['kick', 'warn', 'mute']
  },
  suittag: {
    label: 'SuitTag',
    color: '#aa00ff',
    permissions: ['tag', 'mention']
  },
  premium: {
    label: 'Premium',
    color: '#00ff88',
    permissions: ['premium-feature']
  },
  user: {
    label: 'Usuario',
    color: '#cccccc',
    permissions: []
  }
}
