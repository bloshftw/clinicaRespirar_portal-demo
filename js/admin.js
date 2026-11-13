// Endpoints del panel del ADMIN (backend: controller/acceso/AdminUsuariosController). Solo rol ADMIN.
import { pedir } from './api.js'

/** Respuesta: [{ id, dni, nombre, apellido, roles, activa, bloqueada, debeCambiarPassword }]. */
export function listarPersonal() {
  return pedir('GET', '/api/admin/usuarios')
}

/** datos: { dni, nombre, apellido, roles }. La clave inicial es el DNI, con cambio obligatorio. */
export function crearCuentaPersonal(datos) {
  return pedir('POST', '/api/admin/usuarios', datos)
}

/** Vuelve la clave al DNI, exige cambiarla, quita el bloqueo y cierra sus sesiones. */
export function resetearClave(id) {
  return pedir('POST', `/api/admin/usuarios/${id}/resetear-clave`)
}

export function desbloquear(id) {
  return pedir('POST', `/api/admin/usuarios/${id}/desbloquear`)
}
