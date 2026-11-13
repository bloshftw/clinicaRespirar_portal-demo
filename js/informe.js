// Endpoints del módulo Informes (backend: controller/informe). Los cargan profesionales, laboratorio y secretaría;
// el paciente ve los suyos.
import { pedir } from './api.js'
// Todos los informes abren el mismo PDF (no hay archivos reales detrás)
const PDF_INFORME = 'assets/informes/informe.pdf'

/** Para el personal, anulados incluidos: [{ id, titulo, fechaEstudio, cargadoPor, turnoInicio, anulado, puedeAnular… }]. */
export function informesDelPaciente(pacienteId) {
  return pedir('GET', `/api/informes?pacienteId=${pacienteId}`)
}

/** datos: FormData con pacienteId, turnoId (opcional), titulo, fechaEstudio, descripcion y archivo (el PDF). */
export function cargarInforme(datos) {
  return pedir('POST', '/api/informes', datos)
}

export function anularInforme(id, motivo) {
  return pedir('POST', `/api/informes/${id}/anular`, { motivo })
}

/** Para el paciente: sus informes vigentes. */
export function misInformes() {
  return pedir('GET', '/api/mis-informes')
}

export function urlInforme() {
  return PDF_INFORME
}

export function urlMiInforme() {
  return PDF_INFORME
}
