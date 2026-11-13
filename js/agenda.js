// Endpoints del módulo Agendas (backend: controller/agenda): agendas, horario habitual, excepciones y prácticas.
import { pedir } from './api.js'

/** Respuesta: [{ id, tipo, profesionalId, nombre, pasoMinutos, activa }]. */
export function listarAgendas() {
  return pedir('GET', '/api/agendas')
}

/** Respuesta: la agenda con reglas, excepciones (desde hoy) y prácticas. */
export function obtenerAgenda(id) {
  return pedir('GET', `/api/agendas/${id}`)
}

/** datos: { tipo: 'PROFESIONAL' | 'LABORATORIO', profesionalId, nombre, pasoMinutos }. */
export function crearAgenda(datos) {
  return pedir('POST', '/api/agendas', datos)
}

/** datos: { nombre, pasoMinutos, activa }. */
export function actualizarAgenda(id, datos) {
  return pedir('PUT', `/api/agendas/${id}`, datos)
}

/** Franjas en que atiende ese día: [{ inicio, fin }]. */
export function horarioDelDia(id, fecha) {
  return pedir('GET', `/api/agendas/${id}/horario?fecha=${fecha}`)
}

/** datos: { diaSemana (1 = lunes), horaInicio, horaFin, cadaSemanas, fechaReferencia, vigenteDesde, vigenteHasta }. */
export function agregarRegla(id, datos) {
  return pedir('POST', `/api/agendas/${id}/reglas`, datos)
}

export function actualizarRegla(id, reglaId, datos) {
  return pedir('PUT', `/api/agendas/${id}/reglas/${reglaId}`, datos)
}

export function eliminarRegla(id, reglaId) {
  return pedir('DELETE', `/api/agendas/${id}/reglas/${reglaId}`)
}

/** datos: { fecha, horaInicio, horaFin, tipo: 'APERTURA' | 'BLOQUEO', motivo }. */
export function agregarExcepcion(id, datos) {
  return pedir('POST', `/api/agendas/${id}/excepciones`, datos)
}

export function eliminarExcepcion(id, excepcionId) {
  return pedir('DELETE', `/api/agendas/${id}/excepciones/${excepcionId}`)
}

/** datos: { tipo: 'CONSULTA' | 'PRACTICA', nombre, duracionMinutos, activa, obrasSociales: [ids] }. */
export function agregarPractica(id, datos) {
  return pedir('POST', `/api/agendas/${id}/practicas`, datos)
}

export function actualizarPractica(id, practicaId, datos) {
  return pedir('PUT', `/api/agendas/${id}/practicas/${practicaId}`, datos)
}
