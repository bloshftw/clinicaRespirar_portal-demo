// Endpoints del módulo Personas (backend: controller/persona): especialidades, profesionales y pacientes.
import { pedir } from './api.js'

/** Respuesta: [{ id, nombre, activa }], ordenadas por nombre. */
export function listarEspecialidades() {
  return pedir('GET', '/api/especialidades')
}

export function crearEspecialidad(nombre) {
  return pedir('POST', '/api/especialidades', { nombre })
}

export function actualizarEspecialidad(id, nombre, activa) {
  return pedir('PUT', `/api/especialidades/${id}`, { nombre, activa })
}

/**
 * Respuesta: [{ id, usuarioId, dni, nombre, apellido, titulo, nombreCompleto, especialidadId, especialidad,
 * matriculaTipo, matriculaNumero, activo }], ordenados por apellido.
 */
export function listarProfesionales() {
  return pedir('GET', '/api/profesionales')
}

/** Solo ADMIN. Si el DNI no tiene cuenta, se crea con el DNI como clave inicial; si tiene, se le agrega el rol. */
export function crearProfesional(datos) {
  return pedir('POST', '/api/profesionales', datos)
}

/** Solo ADMIN. El DNI no cambia. */
export function actualizarProfesional(id, datos) {
  return pedir('PUT', `/api/profesionales/${id}`, datos)
}

/** Por número de documento o por apellido y nombre. Hasta 50 resultados. */
export function buscarPacientes(texto) {
  return pedir('GET', `/api/pacientes?buscar=${encodeURIComponent(texto)}`)
}

export function obtenerPaciente(id) {
  return pedir('GET', `/api/pacientes/${id}`)
}

/** Crea la ficha y la cuenta del paciente: usuario y clave inicial = número de documento. */
export function crearPaciente(datos) {
  return pedir('POST', '/api/pacientes', datos)
}

/** El documento no cambia. */
export function actualizarPaciente(id, datos) {
  return pedir('PUT', `/api/pacientes/${id}`, datos)
}
