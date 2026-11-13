// Fichas de pacientes (D38 a D43): búsqueda, alta (que crea su cuenta, D12) y edición.
import { mensajeDeError } from './api.js'
import { insigniaEstado } from './estado-turno.js'
import { edad, fechaBreve, hora } from './fechas.js'
import { marcarEnviando, mostrarError, normalizarTelefono } from './formulario.js'
import { listarObrasSociales } from './obrasocial.js'
import { actualizarPaciente, buscarPacientes, crearPaciente } from './persona.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { turnosDelPaciente } from './turno.js'
import { boton, celda, detalle, elemento, opcion, parametro } from './vista.js'

const TIPOS_DOCUMENTO = { DNI: 'DNI', PASAPORTE: 'Pasaporte', OTRO: 'Doc.' }

const porId = (id) => document.getElementById(id)
const campos = {
  tipoDocumento: porId('tipo-documento'),
  numeroDocumento: porId('numero-documento'),
  nombre: porId('nombre'),
  apellido: porId('apellido'),
  fechaNacimiento: porId('fecha-nacimiento'),
  sexo: porId('sexo'),
  telefono: porId('telefono'),
  localidad: porId('localidad'),
  provincia: porId('provincia'),
  domicilio: porId('domicilio'),
  obraSocial: porId('obra-social'),
  numeroAfiliado: porId('numero-afiliado'),
  responsableNombre: porId('responsable-nombre'),
  responsableApellido: porId('responsable-apellido'),
  responsableDocumento: porId('responsable-documento'),
  responsableTelefono: porId('responsable-telefono'),
  responsableRelacion: porId('responsable-relacion'),
}
const panel = porId('panel-formulario')
const formulario = porId('formulario')
const responsable = porId('responsable')
const error = porId('error')
const mensaje = porId('mensaje')
const errorBusqueda = porId('error-busqueda')
const guardar = porId('guardar')
const textoBusqueda = porId('texto-busqueda')

let obrasSociales = []
let editando = null

async function buscar(texto) {
  mostrarError(errorBusqueda, null)
  try {
    const pacientes = await buscarPacientes(texto)
    porId('filas').replaceChildren(...pacientes.map(fila))
    porId('vacio').hidden = pacientes.length > 0
  } catch (err) {
    mostrarError(errorBusqueda, mensajeDeError(err))
  }
}

function fila(paciente) {
  const tr = elemento('tr')
  tr.append(
    celda([elemento('span', 'font-medium text-slate-900', `${paciente.apellido}, ${paciente.nombre}`),
      paciente.menor ? detalle('Menor de edad') : null]),
    celda(`${TIPOS_DOCUMENTO[paciente.tipoDocumento]} ${paciente.numeroDocumento}`, 'whitespace-nowrap text-slate-600'),
    celda(String(paciente.edad), 'text-slate-600'),
    celda(paciente.telefono, 'whitespace-nowrap text-slate-600'),
    celda(paciente.obraSocial ?? 'Particular', 'text-slate-600'),
    celda(boton('Editar', 'boton-secundario', () => abrirFormulario(paciente)), 'text-right'),
  )
  return tr
}

/** Obras sociales activas; la habitual del paciente se mantiene aunque esté desactivada. */
function llenarObrasSociales(seleccionada) {
  const disponibles = obrasSociales.filter((os) => os.activa || os.id === seleccionada)
  campos.obraSocial.replaceChildren(
    opcion('', 'Particular (sin obra social)', !seleccionada),
    ...disponibles.map((os) => opcion(os.id, os.activa ? os.nombre : `${os.nombre} (desactivada)`, os.id === seleccionada)),
  )
  actualizarAfiliado()
}

function actualizarAfiliado() {
  const conObraSocial = Boolean(campos.obraSocial.value)
  campos.numeroAfiliado.disabled = !conObraSocial
  if (!conObraSocial) campos.numeroAfiliado.value = ''
}

/** Muestra la edad y pide el responsable si es menor (D39), o si la ficha ya tiene uno. */
function actualizarEdad() {
  const fecha = campos.fechaNacimiento.value
  const anios = fecha ? edad(fecha) : null
  porId('edad').textContent = anios === null || anios < 0 ? '' : `${anios} ${anios === 1 ? 'año' : 'años'}`
  responsable.hidden = !((anios !== null && anios < 18) || editando?.responsable)
}

function abrirFormulario(paciente) {
  editando = paciente ?? null
  formulario.reset()
  mostrarError(error, null)
  campos.tipoDocumento.disabled = Boolean(paciente)
  campos.numeroDocumento.disabled = Boolean(paciente)
  delete guardar.dataset.textoOriginal
  if (paciente) {
    campos.tipoDocumento.value = paciente.tipoDocumento
    campos.numeroDocumento.value = paciente.numeroDocumento
    campos.nombre.value = paciente.nombre
    campos.apellido.value = paciente.apellido
    campos.fechaNacimiento.value = paciente.fechaNacimiento
    campos.sexo.value = paciente.sexo ?? ''
    campos.telefono.value = paciente.telefono
    campos.localidad.value = paciente.localidad
    campos.provincia.value = paciente.provincia ?? ''
    campos.domicilio.value = paciente.domicilio ?? ''
    llenarObrasSociales(paciente.obraSocialId)
    campos.numeroAfiliado.value = paciente.numeroAfiliado ?? ''
    const datosResponsable = paciente.responsable ?? {}
    campos.responsableNombre.value = datosResponsable.nombre ?? ''
    campos.responsableApellido.value = datosResponsable.apellido ?? ''
    campos.responsableDocumento.value = datosResponsable.documento ?? ''
    campos.responsableTelefono.value = datosResponsable.telefono ?? ''
    campos.responsableRelacion.value = datosResponsable.relacion ?? 'MADRE'
    porId('titulo-formulario').textContent = `Editar a ${paciente.apellido}, ${paciente.nombre}`
    guardar.textContent = 'Guardar cambios'
    cargarTurnos(paciente.id)
  } else {
    llenarObrasSociales(null)
    porId('titulo-formulario').textContent = 'Nuevo paciente'
    guardar.textContent = 'Crear paciente'
    porId('turnos-paciente').hidden = true
  }
  actualizarEdad()
  panel.hidden = false
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const primerCampo = paciente ? campos.nombre : campos.numeroDocumento
  primerCampo.focus()
}

function cerrarFormulario() {
  editando = null
  formulario.reset()
  panel.hidden = true
}

async function cargarTurnos(pacienteId) {
  const contenedor = porId('turnos-paciente')
  contenedor.hidden = false
  porId('lista-turnos').replaceChildren()
  try {
    const turnos = await turnosDelPaciente(pacienteId)
    porId('lista-turnos').replaceChildren(...turnos.map((turno) => {
      const item = elemento('li', 'flex flex-wrap items-center gap-2 text-slate-700')
      item.append(
        elemento('span', 'font-medium', `${fechaBreve(turno.inicio)} ${hora(turno.inicio)}`),
        elemento('span', '', `${turno.practica} · ${turno.agenda}`),
        insigniaEstado(turno.estado),
      )
      return item
    }))
    porId('sin-turnos').hidden = turnos.length > 0
  } catch {
    contenedor.hidden = true
  }
}

function leerFormulario() {
  const datos = {
    tipoDocumento: campos.tipoDocumento.value,
    numeroDocumento: campos.numeroDocumento.value.replace(/[.\s-]/g, '').toUpperCase(),
    nombre: campos.nombre.value.trim(),
    apellido: campos.apellido.value.trim(),
    fechaNacimiento: campos.fechaNacimiento.value || null,
    sexo: campos.sexo.value || null,
    telefono: normalizarTelefono(campos.telefono.value),
    localidad: campos.localidad.value.trim(),
    provincia: campos.provincia.value.trim() || null,
    domicilio: campos.domicilio.value.trim() || null,
    obraSocialId: campos.obraSocial.value ? Number(campos.obraSocial.value) : null,
    numeroAfiliado: campos.numeroAfiliado.value.trim() || null,
    responsable: null,
  }
  if (!responsable.hidden) {
    const datosResponsable = {
      nombre: campos.responsableNombre.value.trim(),
      apellido: campos.responsableApellido.value.trim(),
      documento: campos.responsableDocumento.value.trim(),
      telefono: normalizarTelefono(campos.responsableTelefono.value),
      relacion: campos.responsableRelacion.value,
    }
    const completoAlgo = [datosResponsable.nombre, datosResponsable.apellido, datosResponsable.documento,
      datosResponsable.telefono].some(Boolean)
    if (completoAlgo) datos.responsable = datosResponsable
  }
  return datos
}

const TELEFONO = /^\+[1-9]\d{7,14}$/

function validar(datos) {
  if (!editando) {
    if (!datos.numeroDocumento) return 'Escribí el número de documento.'
    if (datos.tipoDocumento === 'DNI' && !/^\d{7,8}$/.test(datos.numeroDocumento)) return 'El DNI debe tener 7 u 8 dígitos.'
  }
  if (!datos.nombre || !datos.apellido) return 'Completá el nombre y el apellido.'
  if (!datos.fechaNacimiento) return 'Indicá la fecha de nacimiento.'
  if (!TELEFONO.test(datos.telefono)) return 'Revisá el teléfono: va con código de área, sin 0 ni 15 (por ejemplo, 2657 123456).'
  if (!datos.localidad) return 'Escribí la localidad.'
  if (edad(datos.fechaNacimiento) < 18 && !datos.responsable) return 'Es menor de edad: completá los datos del responsable.'
  if (datos.responsable && !TELEFONO.test(datos.responsable.telefono)) return 'Revisá el teléfono del responsable.'
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
    const paciente = editando ? await actualizarPaciente(editando.id, datos) : await crearPaciente(datos)
    mostrarError(mensaje, editando
      ? `Se guardaron los cambios de ${paciente.apellido}, ${paciente.nombre}.`
      : `Se dio de alta a ${paciente.apellido}, ${paciente.nombre}. Ingresa al portal con su número de documento como usuario y contraseña.`)
    marcarEnviando(guardar, false)
    cerrarFormulario()
    textoBusqueda.value = paciente.numeroDocumento
    await buscar(paciente.numeroDocumento)
  } catch (err) {
    mostrarError(error, mensajeDeError(err))
    marcarEnviando(guardar, false)
  }
})

campos.fechaNacimiento.addEventListener('change', actualizarEdad)
campos.obraSocial.addEventListener('change', actualizarAfiliado)
porId('nuevo').addEventListener('click', () => {
  mostrarError(mensaje, null)
  abrirFormulario(null)
})
porId('cancelar').addEventListener('click', cerrarFormulario)
porId('buscador').addEventListener('submit', (evento) => {
  evento.preventDefault()
  mostrarError(mensaje, null)
  buscar(textoBusqueda.value.trim())
})

const sesion = await exigirSesion('pacientes', rolesDe('pacientes'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'pacientes')
  try {
    obrasSociales = await listarObrasSociales()
  } catch (err) {
    mostrarError(errorBusqueda, mensajeDeError(err))
  }
  textoBusqueda.value = parametro('buscar') ?? ''
  await buscar(textoBusqueda.value)
  if (parametro('nuevo')) abrirFormulario(null)
}
