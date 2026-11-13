/** Error de la API con el mensaje del backend (campo detail de ProblemDetail). */
export class ErrorApi extends Error {
  constructor(status, mensaje, datos = {}) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
    this.datos = datos
  }
}
