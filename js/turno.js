// Endpoints del módulo Turnos (backend: controller/turno). Solo secretaría y ADMIN.
import { pedir } from './api.js'

/** Respuesta: { fecha, pasoMinutos, franjas: [{ inicio, fin }], turnos: [...] } con los cancelados incluidos. */
export function diaDeAgenda(agendaId, fecha) {
  return pedir('GET', `/api/turnos/dia?agendaId=${agendaId}&fecha=${fecha}`)
}

/** Profesional: el día de su propia agenda, solo lectura. Respuesta: { agenda: { id, nombre, pasoMinutos }, fecha, pasoMinutos, franjas, turnos }. */
export function miAgendaDelDia(fecha) {
  return pedir('GET', `/api/mi-agenda/dia?fecha=${fecha}`)
}

/** Horarios de la grilla en que entra la práctica, desde ahora: [{ hora, libre }]. */
export function disponibilidad(agendaId, practicaId, fecha) {
  return pedir('GET', `/api/turnos/disponibilidad?agendaId=${agendaId}&practicaId=${practicaId}&fecha=${fecha}`)
}

export function turnosDelPaciente(pacienteId) {
  return pedir('GET', `/api/turnos?pacienteId=${pacienteId}`)
}

/**
 * datos: { agendaId, practicaId, pacienteId, inicio: 'AAAA-MM-DDTHH:MM', modalidad, primeraVez, motivo,
 * obraSocialId (null = particular), sobreturno }. El turno nace confirmado.
 */
export function darTurno(datos) {
  return pedir('POST', '/api/turnos', datos)
}

export function cancelarTurno(id, motivo) {
  return pedir('POST', `/api/turnos/${id}/cancelar`, { motivo })
}

export function marcarAtendido(id) {
  return pedir('POST', `/api/turnos/${id}/atendido`)
}

export function marcarAusente(id) {
  return pedir('POST', `/api/turnos/${id}/ausente`)
}

/** Cancela el turno (motivo "Reprogramado") y devuelve el nuevo, en la misma agenda y con la misma práctica. */
export function reprogramarTurno(id, inicio, sobreturno) {
  return pedir('POST', `/api/turnos/${id}/reprogramar`, { inicio, sobreturno })
}

/** Respuesta: [{ estadoAnterior, estadoNuevo, fechaHora, usuario, motivo }]. */
export function historialDelTurno(id) {
  return pedir('GET', `/api/turnos/${id}/historial`)
}
