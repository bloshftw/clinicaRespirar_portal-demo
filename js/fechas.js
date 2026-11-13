// Fechas y horas tal como las maneja la API, siempre en hora de la clínica:
// fecha 'AAAA-MM-DD', hora 'HH:MM' (o 'HH:MM:SS') y fecha con hora 'AAAA-MM-DDTHH:MM[:SS]'.

const dos = (numero) => String(numero).padStart(2, '0')

function desdeIso(fechaIso) {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}

function aIso(fecha) {
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
}

/** Hoy, en la computadora del usuario. No se usa toISOString: daría la fecha en UTC (de noche, el día siguiente). */
export function hoy() {
  return aIso(new Date())
}

export function sumarDias(fechaIso, dias) {
  const fecha = desdeIso(fechaIso)
  fecha.setDate(fecha.getDate() + dias)
  return aIso(fecha)
}

/** 'Lunes, 3 de junio de 2030' */
export function fechaLarga(fechaIso) {
  const texto = desdeIso(fechaIso).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** 'lunes' */
export function diaDeLaSemana(fechaIso) {
  return desdeIso(fechaIso).toLocaleDateString('es-AR', { weekday: 'long' })
}

/** '03/06/2030' */
export function fechaCorta(fechaIso) {
  const [anio, mes, dia] = fechaIso.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/** 'lun 03/06' para listas con muchas fechas. */
export function fechaBreve(fechaIso) {
  const dia = desdeIso(fechaIso).toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')
  return `${dia} ${fechaCorta(fechaIso).slice(0, 5)}`
}

/** '09:20' a partir de '09:20:00' o de '2030-06-03T09:20:00'. */
export function hora(texto) {
  return texto.includes('T') ? texto.slice(11, 16) : texto.slice(0, 5)
}

/** diaSemana de la API: 1 = lunes ... 7 = domingo. */
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function nombreDia(diaSemana) {
  return DIAS_SEMANA[diaSemana - 1]
}

/** Edad cumplida a hoy. */
export function edad(fechaNacimientoIso) {
  const nacimiento = desdeIso(fechaNacimientoIso)
  const actual = new Date()
  let anios = actual.getFullYear() - nacimiento.getFullYear()
  const cumpleEsteAnio = new Date(actual.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())
  if (actual < cumpleEsteAnio) anios -= 1
  return anios
}
