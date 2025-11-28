// ✦ Middleware de Permisos LATAM ✦ Swill
// Diseñado por Mahykol ✦
// Compatible con roles dinámicos, permisos personalizados y sistema avanzado de moderación.

import { hasRole } from './lib-roles.js'
import { PERMISSIONS } from './permissions-config.js'  // Archivo donde defines tus permisos

/**
 * Obtiene la información completa de un permiso.
 * { id, name, description }
 */
export function getPermissionInfo(id) {
  return PERMISSIONS[id] || null
}

/**
 * Lista todos los permisos definidos en el sistema.
 */
export function listAllPermissions() {
  return Object.keys(PERMISSIONS)
}

/**
 * Verifica si un usuario tiene un permiso específico.
 * - ROOWNER y OWNER → acceso total
 * - Roles → permisos asignados al rol
 * - Permisos individuales → si existen
 * - Permisos comunes → todos los usuarios
 */
export function hasPermission(jid, permId) {
  // ROOWNER → acceso total
  if (hasRole('roowner', jid)) return true

  // OWNER → acceso total
  if (hasRole('owners', jid)) return true

  // MODS → permisos asignados al rol
  if (hasRole('mods', jid)) {
    const modPerms = PERMISSIONS.__ROLE_MOD__ || []
    if (modPerms.includes(permId)) return true
  }

  // Permisos individuales (si los usas)
  if (global.userPermissions?.[jid]?.includes(permId)) return true

  // Permisos comunes
  if (PERMISSIONS.__COMMON__?.includes(permId)) return true

  return false
}

/**
 * Lanza error si el usuario NO tiene el permiso.
 */
export function requirePermission(m, permId) {
  const jid = m.sender
  if (!hasPermission(jid, permId)) {
    throw new Error(`NO_PERMISSION:${permId}`)
  }
  return true
}

/**
 * Solo ROOWNER
 */
export function requireRoowner(m) {
  const jid = m.sender
  if (!hasRole('roowner', jid)) {
    throw new Error('NO_ROOWNER')
  }
  return true
}

/**
 * Solo OWNER o ROOWNER
 */
export function requireOwner(m) {
  const jid = m.sender
  if (hasRole('owners', jid) || hasRole('roowner', jid)) {
    return true
  }
  throw new Error('NO_OWNER')
}