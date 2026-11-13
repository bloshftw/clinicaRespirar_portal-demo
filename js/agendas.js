// Agendas (D11): listado y alta. La configuración de cada una está en configurar-agenda.html.
import { crearAgenda, listarAgendas } from './agenda.js'
import { mensajeDeError } from './api.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { listarProfesionales } from './persona.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { celda, detalle, elemento, insignia, opcion } from './vista.js'

const formulario = document.getElementById('formulario')
const tipo = document.getElementById('tipo')
const profesional = document.getElementById('profesional')
const error = document.getElementById('error')
const errorLista = document.getElementById('error-lista')
const crear = document.getElementById('crear')

let agendas = []
let profesionales = []

async function cargar() {
  mostrarError(errorLista, null)
  try {
    const [listaAgendas, listaProfesionales] = await Promise.all([listarAgendas(), listarProfesionales()])
    agendas = listaAgendas
    profesionales = listaProfesionales
  } catch (err) {
    mostrarError(errorLista, mensajeDeError(err))
    return
  }
  document.getElementById('filas').replaceChildren(...agendas.map(fila))
  document.getElementById('vacio').hidden = agendas.length > 0
  llenarProfesionales()
  // Hay una sola agenda del laboratorio (D11)
  tipo.querySelector('option[value="LABORATORIO"]').disabled = agendas.some((agenda) => agenda.tipo === 'LABORATORIO')
}

function fila(agenda) {
  const tr = elemento('tr')
  const enlace = elemento('a', 'enlace', agenda.nombre)
  enlace.href = `configurar-agenda.html?id=${agenda.id}`
  const configurar = elemento('a', 'boton-secundario', 'Configurar')
  configurar.href = enlace.href
  tr.append(
    celda([enlace, agenda.activa ? null : detalle('Desactivada: no se dan turnos nuevos')]),
    celda(agenda.tipo === 'LABORATORIO' ? insignia('Laboratorio', 'azul') : insignia('Profesional')),
    celda(`Cada ${agenda.pasoMinutos} min`, 'whitespace-nowrap text-slate-600'),
    celda(configurar, 'text-right'),
  )
  return tr
}

/** Profesionales activos que todavía no tienen agenda: uno puede tener una sola (D11). */
function llenarProfesionales() {
  const sinAgenda = profesionales.filter((p) => p.activo && !agendas.some((agenda) => agenda.profesionalId === p.id))
  profesional.replaceChildren(
    opcion('', sinAgenda.length ? 'Elegí el profesional' : 'Todos los profesionales ya tienen agenda'),
    ...sinAgenda.map((p) => opcion(p.id, `${p.nombreCompleto} · ${p.especialidad}`)),
  )
}

function actualizarTipo() {
  document.getElementById('campo-profesional').hidden = tipo.value !== 'PROFESIONAL'
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const esDeProfesional = tipo.value === 'PROFESIONAL'
  const datos = {
    tipo: tipo.value,
    profesionalId: esDeProfesional && profesional.value ? Number(profesional.value) : null,
    nombre: document.getElementById('nombre').value.trim() || null,
    pasoMinutos: Number(document.getElementById('paso').value),
  }
  if (esDeProfesional && !datos.profesionalId) {
    mostrarError(error, 'Elegí el profesional.')
    return
  }
  if (!Number.isInteger(datos.pasoMinutos) || datos.pasoMinutos < 5 || datos.pasoMinutos > 240) {
    mostrarError(error, 'La grilla tiene que ser de 5 a 240 minutos.')
    return
  }
  mostrarError(error, null)
  marcarEnviando(crear, true, 'Creando…')
  try {
    const agenda = await crearAgenda(datos)
    location.href = `configurar-agenda.html?id=${agenda.id}&nueva=1`
  } catch (err) {
    mostrarError(error, mensajeDeError(err))
    marcarEnviando(crear, false)
  }
})

tipo.addEventListener('change', actualizarTipo)

const sesion = await exigirSesion('agendas', rolesDe('agendas'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'agendas')
  actualizarTipo()
  await cargar()
}
