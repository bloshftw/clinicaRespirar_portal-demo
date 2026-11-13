// Profesionales (D9, D44): la secretaría los consulta; el ADMIN los crea junto con su cuenta y los edita.
import { mensajeDeError } from './api.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { actualizarProfesional, crearProfesional, listarEspecialidades, listarProfesionales } from './persona.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { boton, celda, detalle, elemento, opcion } from './vista.js'

const formulario = document.getElementById('formulario')
const campos = {
  dni: document.getElementById('dni'),
  titulo: document.getElementById('titulo'),
  nombre: document.getElementById('nombre'),
  apellido: document.getElementById('apellido'),
  especialidad: document.getElementById('especialidad'),
  matriculaTipo: document.getElementById('matricula-tipo'),
  matriculaNumero: document.getElementById('matricula-numero'),
}
const error = document.getElementById('error')
const mensaje = document.getElementById('mensaje')
const errorLista = document.getElementById('error-lista')
const guardar = document.getElementById('guardar')
const cancelarEdicion = document.getElementById('cancelar-edicion')
const tituloFormulario = document.getElementById('titulo-formulario')

let especialidades = []
let editando = null
let esAdmin = false

async function cargar() {
  mostrarError(errorLista, null)
  try {
    const [profesionales, catalogo] = await Promise.all([listarProfesionales(), listarEspecialidades()])
    especialidades = catalogo
    document.getElementById('filas').replaceChildren(...profesionales.map(fila))
    document.getElementById('vacio').hidden = profesionales.length > 0
    if (!editando) llenarEspecialidades(null)
  } catch (err) {
    mostrarError(errorLista, mensajeDeError(err))
  }
}

function fila(profesional) {
  const tr = elemento('tr')
  const matricula = profesional.matriculaTipo ? `${profesional.matriculaTipo} ${profesional.matriculaNumero}` : '—'
  tr.append(
    celda([elemento('span', 'font-medium text-slate-900', profesional.nombreCompleto),
      profesional.activo ? null : detalle('Desactivado')]),
    celda(profesional.especialidad, 'text-slate-600'),
    celda(matricula, 'text-slate-600'),
    celda(profesional.dni, 'text-slate-600'),
    celda(esAdmin ? boton('Editar', 'boton-secundario', () => editar(profesional)) : null, 'text-right'),
  )
  return tr
}

/** Especialidades activas; la del profesional que se edita se mantiene aunque esté desactivada. */
function llenarEspecialidades(seleccionada) {
  const disponibles = especialidades.filter((esp) => esp.activa || esp.id === seleccionada)
  campos.especialidad.replaceChildren(
    opcion('', disponibles.length ? 'Elegí una especialidad' : 'Primero cargá especialidades en Catálogos', !seleccionada),
    ...disponibles.map((esp) => opcion(esp.id, esp.activa ? esp.nombre : `${esp.nombre} (desactivada)`, esp.id === seleccionada)),
  )
}

function editar(profesional) {
  editando = profesional
  campos.dni.value = profesional.dni
  campos.dni.disabled = true
  campos.titulo.value = profesional.titulo
  campos.nombre.value = profesional.nombre ?? ''
  campos.apellido.value = profesional.apellido ?? ''
  llenarEspecialidades(profesional.especialidadId)
  campos.matriculaTipo.value = profesional.matriculaTipo ?? ''
  campos.matriculaNumero.value = profesional.matriculaNumero ?? ''
  tituloFormulario.textContent = `Editar a ${profesional.nombreCompleto}`
  guardar.textContent = 'Guardar cambios'
  delete guardar.dataset.textoOriginal
  cancelarEdicion.hidden = false
  mostrarError(error, null)
  document.getElementById('panel-formulario').scrollIntoView({ behavior: 'smooth', block: 'start' })
  campos.nombre.focus()
}

function terminarEdicion() {
  editando = null
  formulario.reset()
  campos.dni.disabled = false
  tituloFormulario.textContent = 'Nuevo profesional'
  guardar.textContent = 'Crear profesional'
  delete guardar.dataset.textoOriginal
  cancelarEdicion.hidden = true
  llenarEspecialidades(null)
}

function leerFormulario() {
  return {
    dni: campos.dni.value.replace(/[.\s]/g, ''),
    titulo: campos.titulo.value,
    nombre: campos.nombre.value.trim(),
    apellido: campos.apellido.value.trim(),
    especialidadId: campos.especialidad.value ? Number(campos.especialidad.value) : null,
    matriculaTipo: campos.matriculaTipo.value || null,
    matriculaNumero: campos.matriculaNumero.value.trim() || null,
  }
}

function validar(datos) {
  if (!/^\d{7,8}$/.test(datos.dni)) return 'El DNI debe tener 7 u 8 dígitos.'
  if (!datos.nombre || !datos.apellido) return 'Completá el nombre y el apellido.'
  if (!datos.especialidadId) return 'Elegí la especialidad.'
  if (Boolean(datos.matriculaTipo) !== Boolean(datos.matriculaNumero)) {
    return 'Completá el tipo y el número de matrícula, o dejá los dos vacíos.'
  }
  return null
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const datos = leerFormulario()
  const problema = validar(datos)
  if (problema) {
    mostrarError(error, problema)
    return
  }
  mostrarError(error, null)
  marcarEnviando(guardar, true, 'Guardando…')
  try {
    const profesional = editando
      ? await actualizarProfesional(editando.id, datos)
      : await crearProfesional(datos)
    mostrarError(mensaje, editando
      ? `Se guardaron los cambios de ${profesional.nombreCompleto}.`
      : `Se creó la ficha de ${profesional.nombreCompleto}. Si no tenía cuenta, ingresa con su DNI como contraseña y la cambia en el primer ingreso.`)
    marcarEnviando(guardar, false)
    terminarEdicion()
    await cargar()
  } catch (err) {
    mostrarError(error, mensajeDeError(err))
    marcarEnviando(guardar, false)
  }
})

cancelarEdicion.addEventListener('click', terminarEdicion)

const sesion = await exigirSesion('profesionales', rolesDe('profesionales'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'profesionales')
  esAdmin = sesion.usuario.roles.includes('ADMIN')
  document.getElementById('panel-formulario').hidden = !esAdmin
  document.getElementById('aviso-solo-admin').hidden = esAdmin
  await cargar()
}
