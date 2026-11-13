// Secciones del portal y qué roles entran a cada una: las mismas reglas que SecurityConfig en el backend.
import { logout } from './auth.js'
import { boton, elemento } from './vista.js'

export const SECCIONES = [
  { id: 'mis-informes', archivo: 'mis-informes.html', titulo: 'Mis informes', descripcion: 'Tus informes y estudios en PDF, para ver o descargar.', roles: ['PACIENTE'] },
  { id: 'turnos', archivo: 'turnos.html', titulo: 'Turnos', descripcion: 'El día de cada agenda: dar, cancelar y reprogramar turnos.', roles: ['SECRETARIA', 'ADMIN'] },
  { id: 'pacientes', archivo: 'pacientes.html', titulo: 'Pacientes', descripcion: 'Buscar, dar de alta y editar fichas.', roles: ['SECRETARIA', 'ADMIN'] },
  { id: 'mi-agenda', archivo: 'mi-agenda.html', titulo: 'Mi agenda', descripcion: 'Tus turnos de cada día, con acceso a los informes de cada paciente.', roles: ['PROFESIONAL'] },
  { id: 'informes', archivo: 'informes.html', titulo: 'Informes', descripcion: 'Cargar informes en PDF y entregarlos a cada paciente.', roles: ['PROFESIONAL', 'LABORATORIO', 'SECRETARIA'] },
  { id: 'agendas', archivo: 'agendas.html', titulo: 'Agendas', descripcion: 'Horario habitual, excepciones y prácticas de cada agenda.', roles: ['SECRETARIA', 'ADMIN'] },
  { id: 'profesionales', archivo: 'profesionales.html', titulo: 'Profesionales', descripcion: 'Fichas de los profesionales y sus cuentas.', roles: ['SECRETARIA', 'ADMIN'] },
  { id: 'catalogos', archivo: 'catalogos.html', titulo: 'Catálogos', descripcion: 'Obras sociales y especialidades.', roles: ['SECRETARIA', 'ADMIN'] },
  { id: 'personal', archivo: 'personal.html', titulo: 'Personal', descripcion: 'Cuentas de secretaría, laboratorio y administración.', roles: ['ADMIN'] },
]

export function rolesDe(id) {
  return SECCIONES.find((seccion) => seccion.id === id).roles
}

export function seccionesPara(roles) {
  return SECCIONES.filter((seccion) => seccion.roles.some((rol) => roles.includes(rol)))
}

/** Menú del encabezado (#menu) con las secciones del usuario y el botón para salir. actual: la sección que se ve. */
export function mostrarMenu(roles, actual) {
  const menu = document.getElementById('menu')
  if (!menu) return
  const enlaces = seccionesPara(roles).map((seccion) => {
    const esActual = seccion.id === actual
    const enlace = elemento('a', esActual
      ? 'rounded-lg bg-brand/10 px-3 py-1.5 font-medium text-brand-dark'
      : 'rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100', seccion.titulo)
    enlace.href = seccion.archivo
    if (esActual) enlace.setAttribute('aria-current', 'page')
    return enlace
  })
  const salir = boton('Salir', 'rounded-lg px-3 py-1.5 font-medium text-slate-500 hover:bg-slate-100', async () => {
    salir.disabled = true
    try {
      await logout()
    } finally {
      location.replace('login.html')
    }
  })
  menu.replaceChildren(...enlaces, salir)
}
