// Cliente de la API de la demo. Mantiene la misma interfaz que el del portal real (pedir, ErrorApi, mensajeDeError),
// así las pantallas son las mismas, pero no hay red: cada pedido lo responde el servidor simulado (js/demo/servidor.js).
import { ErrorApi } from './error-api.js'
import { atender } from './demo/servidor.js'

export { ErrorApi }

/** Devuelve el JSON de la respuesta (o undefined si no tiene cuerpo). Si la operación falla, lanza ErrorApi con el mensaje. */
export function pedir(metodo, ruta, cuerpo) {
  return atender(metodo, ruta, cuerpo)
}

/** Mensaje para mostrar en pantalla a partir de cualquier error. */
export function mensajeDeError(error) {
  return error instanceof ErrorApi ? error.message : 'No se pudo completar la operación. Probá de nuevo.'
}
