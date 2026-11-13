// Endpoints del módulo Obras sociales (backend: controller/obrasocial). Los modifican secretaría y ADMIN.
import { pedir } from './api.js'

/** Respuesta: [{ id, nombre, activa }], ordenadas por nombre, activas e inactivas. */
export function listarObrasSociales() {
  return pedir('GET', '/api/obras-sociales')
}

export function crearObraSocial(nombre) {
  return pedir('POST', '/api/obras-sociales', { nombre })
}

/** Una obra social desactivada no se ofrece en fichas ni turnos nuevos. */
export function actualizarObraSocial(id, nombre, activa) {
  return pedir('PUT', `/api/obras-sociales/${id}`, { nombre, activa })
}
