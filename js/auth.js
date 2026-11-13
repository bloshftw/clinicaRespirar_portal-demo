// Endpoints de autenticación (backend: controller/acceso/AuthController).
import { pedir } from './api.js'

/** Respuesta: { tipo: 'COMPLETO' | 'RESTRINGIDO', expiraEn }. El token queda en la cookie de sesión. */
export function login(dni, password) {
  return pedir('POST', '/api/auth/login', { dni, password })
}

export function cambiarPassword(passwordActual, passwordNueva) {
  return pedir('POST', '/api/auth/cambiar-password', { passwordActual, passwordNueva })
}

export function logout() {
  return pedir('POST', '/api/auth/logout')
}

/** Respuesta: { id, tipoToken, roles }. */
export function obtenerUsuarioActual() {
  return pedir('GET', '/api/auth/yo')
}
