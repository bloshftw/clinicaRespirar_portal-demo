// Configuración de una agenda: datos, horario habitual (D20), excepciones (D20) y prácticas con su cobertura (D33 a D35).
import {
  actualizarAgenda, actualizarPractica, actualizarRegla, agregarExcepcion, agregarPractica, agregarRegla,
  eliminarExcepcion, eliminarRegla, horarioDelDia, obtenerAgenda,
} from './agenda.js'
import { mensajeDeError } from './api.js'
import { DIAS_SEMANA, diaDeLaSemana, fechaCorta, fechaLarga, hora, hoy, nombreDia } from './fechas.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { listarObrasSociales } from './obrasocial.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { boton, celda, conBoton, detalle, elemento, insignia, opcion, parametro } from './vista.js'

const porId = (id) => document.getElementById(id)
const agendaId = Number(parametro('id'))

/** Un bloqueo de todo el día va de 00:00 a 23:59. */
const TODO_EL_DIA = { inicio: '00:00', fin: '23:59' }

let agenda = null
let obrasSociales = []
let reglaEditada = null
let practicaEditada = null

/** Muestra un mensaje en un aviso y limpia el otro (éxito o error) de la misma sección. */
function avisar(idMostrar, texto, idOcultar) {
  if (idOcultar) mostrarError(porId(idOcultar), null)
  mostrarError(porId(idMostrar), texto)
}

async function cargar() {
  agenda = await obtenerAgenda(agendaId)
  dibujarDatos()
  dibujarReglas()
  dibujarExcepciones()
  dibujarPracticas()
}

/** Recarga después de un cambio y actualiza la vista del día, que depende de reglas y excepciones. */
async function recargar() {
  await cargar()
  await mostrarDia()
}

// Datos

function dibujarDatos() {
  porId('nombre-agenda').textContent = agenda.nombre
  document.title = `${agenda.nombre} · Portal Clínica Respirar`
  porId('tipo-agenda').replaceChildren(...[
    agenda.tipo === 'LABORATORIO' ? insignia('Laboratorio', 'azul') : insignia('Profesional'),
    agenda.activa ? null : insignia('Desactivada', 'rojo'),
  ].filter(Boolean))
  porId('datos-nombre').value = agenda.nombre
  porId('datos-paso').value = agenda.pasoMinutos
  porId('datos-activa').checked = agenda.activa
}

porId('form-datos').addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const datos = {
    nombre: porId('datos-nombre').value.trim(),
    pasoMinutos: Number(porId('datos-paso').value),
    activa: porId('datos-activa').checked,
  }
  if (!datos.nombre) {
    avisar('error-datos', 'Escribí el nombre.', 'exito-datos')
    return
  }
  const guardar = porId('guardar-datos')
  marcarEnviando(guardar, true, 'Guardando…')
  try {
    await actualizarAgenda(agendaId, datos)
    avisar('exito-datos', 'Se guardaron los datos.', 'error-datos')
    await recargar()
  } catch (err) {
    avisar('error-datos', mensajeDeError(err), 'exito-datos')
  } finally {
    marcarEnviando(guardar, false)
  }
})

// Ver un día

async function mostrarDia() {
  const fecha = porId('dia-consulta').value
  const resultado = porId('horario-dia')
  if (!fecha) {
    resultado.textContent = ''
    return
  }
  try {
    const franjas = await horarioDelDia(agendaId, fecha)
    resultado.textContent = franjas.length
      ? `${fechaLarga(fecha)}: atiende ${franjas.map((f) => `de ${hora(f.inicio)} a ${hora(f.fin)}`).join(' y ')}.`
      : `${fechaLarga(fecha)}: no atiende.`
  } catch (err) {
    resultado.textContent = mensajeDeError(err)
  }
}

porId('dia-consulta').addEventListener('change', mostrarDia)

// Horario habitual

const regla = {
  dia: porId('regla-dia'),
  inicio: porId('regla-inicio'),
  fin: porId('regla-fin'),
  cada: porId('regla-cada'),
  referencia: porId('regla-referencia'),
  desde: porId('regla-desde'),
  hasta: porId('regla-hasta'),
}

function textoRepeticion(datos) {
  if (datos.cadaSemanas === 1) return 'Todas las semanas'
  const cada = datos.cadaSemanas === 2 ? 'Una sí y otra no' : `Cada ${datos.cadaSemanas} semanas`
  return `${cada} (por ejemplo, el ${fechaCorta(datos.fechaReferencia)})`
}

function textoVigencia(datos) {
  return datos.vigenteHasta
    ? `Del ${fechaCorta(datos.vigenteDesde)} al ${fechaCorta(datos.vigenteHasta)}`
    : `Desde el ${fechaCorta(datos.vigenteDesde)}`
}

function dibujarReglas() {
  porId('filas-reglas').replaceChildren(...agenda.reglas.map(filaRegla))
  porId('vacio-reglas').hidden = agenda.reglas.length > 0
}

function filaRegla(datos) {
  const eliminar = boton('Eliminar', 'boton-peligro', () => {
    const franja = `${nombreDia(datos.diaSemana).toLowerCase()} de ${hora(datos.horaInicio)} a ${hora(datos.horaFin)}`
    if (!confirm(`¿Eliminar la franja del ${franja}? Si el horario cambia desde una fecha, conviene editarla y completar "Vigente hasta".`)) return
    conBoton(eliminar, async () => {
      await eliminarRegla(agendaId, datos.id)
      if (reglaEditada?.id === datos.id) limpiarFormRegla()
      avisar('exito-reglas', 'Se eliminó la franja.', 'error-regla')
      await recargar()
    }, (err) => avisar('error-regla', mensajeDeError(err), 'exito-reglas'))
  })
  const acciones = elemento('div', 'flex justify-end gap-2')
  acciones.append(boton('Editar', 'boton-secundario', () => editarRegla(datos)), eliminar)
  const tr = elemento('tr')
  tr.append(
    celda(nombreDia(datos.diaSemana), 'font-medium text-slate-900'),
    celda(`${hora(datos.horaInicio)} a ${hora(datos.horaFin)}`, 'whitespace-nowrap'),
    celda(textoRepeticion(datos), 'text-slate-600'),
    celda(textoVigencia(datos), 'text-slate-600'),
    celda(acciones),
  )
  return tr
}

function actualizarReferencia() {
  porId('campo-referencia').hidden = regla.cada.value === '1'
}

function limpiarFormRegla() {
  reglaEditada = null
  regla.dia.value = '1'
  regla.inicio.value = '09:00'
  regla.fin.value = '12:00'
  regla.cada.value = '1'
  regla.referencia.value = ''
  regla.desde.value = hoy()
  regla.hasta.value = ''
  porId('titulo-form-regla').textContent = 'Agregar una franja'
  porId('guardar-regla').textContent = 'Agregar franja'
  delete porId('guardar-regla').dataset.textoOriginal
  porId('cancelar-regla').hidden = true
  actualizarReferencia()
}

function editarRegla(datos) {
  reglaEditada = datos
  regla.dia.value = String(datos.diaSemana)
  regla.inicio.value = hora(datos.horaInicio)
  regla.fin.value = hora(datos.horaFin)
  regla.cada.value = String(datos.cadaSemanas)
  regla.referencia.value = datos.fechaReferencia ?? ''
  regla.desde.value = datos.vigenteDesde
  regla.hasta.value = datos.vigenteHasta ?? ''
  porId('titulo-form-regla').textContent = `Editar la franja del ${nombreDia(datos.diaSemana).toLowerCase()}`
  porId('guardar-regla').textContent = 'Guardar cambios'
  delete porId('guardar-regla').dataset.textoOriginal
  porId('cancelar-regla').hidden = false
  actualizarReferencia()
  porId('form-regla').scrollIntoView({ behavior: 'smooth', block: 'center' })
}

porId('form-regla').addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const cadaSemanas = Number(regla.cada.value)
  const datos = {
    diaSemana: Number(regla.dia.value),
    horaInicio: regla.inicio.value,
    horaFin: regla.fin.value,
    cadaSemanas,
    fechaReferencia: cadaSemanas > 1 ? regla.referencia.value || null : null,
    vigenteDesde: regla.desde.value || null,
    vigenteHasta: regla.hasta.value || null,
  }
  let problema = null
  if (!datos.horaInicio || !datos.horaFin || datos.horaInicio >= datos.horaFin) problema = 'La hora de inicio tiene que ser anterior a la de fin.'
  else if (!datos.vigenteDesde) problema = 'Indicá desde cuándo rige.'
  else if (cadaSemanas > 1 && !datos.fechaReferencia) problema = 'Indicá un día en que atiende, para saber qué semanas corresponden.'
  if (problema) {
    avisar('error-regla', problema, 'exito-reglas')
    return
  }
  const guardar = porId('guardar-regla')
  marcarEnviando(guardar, true, 'Guardando…')
  try {
    if (reglaEditada) {
      await actualizarRegla(agendaId, reglaEditada.id, datos)
    } else {
      await agregarRegla(agendaId, datos)
    }
    avisar('exito-reglas', reglaEditada ? 'Se guardó la franja.' : 'Se agregó la franja.', 'error-regla')
    marcarEnviando(guardar, false)
    limpiarFormRegla()
    await recargar()
  } catch (err) {
    avisar('error-regla', mensajeDeError(err), 'exito-reglas')
    marcarEnviando(guardar, false)
  }
})

regla.cada.addEventListener('change', actualizarReferencia)
porId('cancelar-regla').addEventListener('click', limpiarFormRegla)

// Excepciones

const excepcion = {
  fecha: porId('excepcion-fecha'),
  tipo: porId('excepcion-tipo'),
  inicio: porId('excepcion-inicio'),
  fin: porId('excepcion-fin'),
  motivo: porId('excepcion-motivo'),
  todoElDia: porId('excepcion-todo-el-dia'),
}

const esTodoElDia = (datos) => hora(datos.horaInicio) === TODO_EL_DIA.inicio && hora(datos.horaFin) === TODO_EL_DIA.fin

function dibujarExcepciones() {
  porId('filas-excepciones').replaceChildren(...agenda.excepciones.map(filaExcepcion))
  porId('vacio-excepciones').hidden = agenda.excepciones.length > 0
}

function filaExcepcion(datos) {
  const eliminar = boton('Eliminar', 'boton-peligro', () => {
    if (!confirm(`¿Eliminar la excepción del ${fechaCorta(datos.fecha)}?`)) return
    conBoton(eliminar, async () => {
      await eliminarExcepcion(agendaId, datos.id)
      avisar('exito-excepciones', 'Se eliminó la excepción.', 'error-excepcion')
      await recargar()
    }, (err) => avisar('error-excepcion', mensajeDeError(err), 'exito-excepciones'))
  })
  const tr = elemento('tr')
  tr.append(
    celda([elemento('span', 'font-medium text-slate-900', fechaCorta(datos.fecha)), detalle(diaDeLaSemana(datos.fecha))]),
    celda(esTodoElDia(datos) ? 'Todo el día' : `${hora(datos.horaInicio)} a ${hora(datos.horaFin)}`, 'whitespace-nowrap'),
    celda(datos.tipo === 'BLOQUEO' ? insignia('Bloqueo', 'rojo') : insignia('Apertura', 'verde')),
    celda(datos.motivo ?? '—', 'text-slate-600'),
    celda(eliminar, 'text-right'),
  )
  return tr
}

/** "Todo el día" solo tiene sentido para un bloqueo (un feriado); deshabilita las horas. */
function actualizarTodoElDia() {
  const esBloqueo = excepcion.tipo.value === 'BLOQUEO'
  porId('campo-todo-el-dia').hidden = !esBloqueo
  if (!esBloqueo) excepcion.todoElDia.checked = false
  excepcion.inicio.disabled = excepcion.todoElDia.checked
  excepcion.fin.disabled = excepcion.todoElDia.checked
}

function limpiarFormExcepcion() {
  excepcion.fecha.value = ''
  excepcion.fecha.min = hoy()
  excepcion.tipo.value = 'BLOQUEO'
  excepcion.inicio.value = '09:00'
  excepcion.fin.value = '12:00'
  excepcion.motivo.value = ''
  excepcion.todoElDia.checked = false
  actualizarTodoElDia()
}

porId('form-excepcion').addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const todoElDia = excepcion.todoElDia.checked
  const datos = {
    fecha: excepcion.fecha.value || null,
    tipo: excepcion.tipo.value,
    horaInicio: todoElDia ? TODO_EL_DIA.inicio : excepcion.inicio.value,
    horaFin: todoElDia ? TODO_EL_DIA.fin : excepcion.fin.value,
    motivo: excepcion.motivo.value.trim() || null,
  }
  let problema = null
  if (!datos.fecha) problema = 'Indicá la fecha.'
  else if (!datos.horaInicio || !datos.horaFin || datos.horaInicio >= datos.horaFin) problema = 'La hora de inicio tiene que ser anterior a la de fin.'
  if (problema) {
    avisar('error-excepcion', problema, 'exito-excepciones')
    return
  }
  const guardar = porId('guardar-excepcion')
  marcarEnviando(guardar, true, 'Guardando…')
  try {
    await agregarExcepcion(agendaId, datos)
    avisar('exito-excepciones', 'Se agregó la excepción.', 'error-excepcion')
    limpiarFormExcepcion()
    await recargar()
  } catch (err) {
    avisar('error-excepcion', mensajeDeError(err), 'exito-excepciones')
  } finally {
    marcarEnviando(guardar, false)
  }
})

excepcion.tipo.addEventListener('change', actualizarTodoElDia)
excepcion.todoElDia.addEventListener('change', actualizarTodoElDia)

// Consultas y prácticas

const practica = {
  tipo: porId('practica-tipo'),
  nombre: porId('practica-nombre'),
  duracion: porId('practica-duracion'),
  activa: porId('practica-activa'),
}

function nombreObraSocial(id) {
  return obrasSociales.find((os) => os.id === id)?.nombre
}

function textoCobertura(datos) {
  if (!datos.obrasSociales.length) return 'Solo particular'
  const nombres = datos.obrasSociales.map(nombreObraSocial).filter(Boolean)
  return nombres.length <= 3 ? `Particular, ${nombres.join(', ')}` : `Particular y ${nombres.length} obras sociales`
}

function dibujarPracticas() {
  porId('filas-practicas').replaceChildren(...agenda.practicas.map(filaPractica))
  porId('vacio-practicas').hidden = agenda.practicas.length > 0
}

function filaPractica(datos) {
  const cobertura = celda(textoCobertura(datos), 'text-slate-600')
  cobertura.title = datos.obrasSociales.map(nombreObraSocial).filter(Boolean).join(', ')
  const tr = elemento('tr')
  tr.append(
    celda([elemento('span', 'font-medium text-slate-900', datos.nombre),
      datos.activa ? null : detalle('Desactivada: no se ofrece')]),
    celda(datos.tipo === 'CONSULTA' ? 'Consulta' : 'Práctica', 'text-slate-600'),
    celda(`${datos.duracionMinutos} min`, 'whitespace-nowrap text-slate-600'),
    cobertura,
    celda(boton('Editar', 'boton-secundario', () => editarPractica(datos)), 'text-right'),
  )
  return tr
}

/** Obras sociales activas, más las desactivadas que la práctica ya tenía (para no perderlas al guardar). */
function dibujarCoberturas(marcadas) {
  const visibles = obrasSociales.filter((os) => os.activa || marcadas.has(os.id))
  porId('coberturas').replaceChildren(...visibles.map((os) => {
    const etiqueta = elemento('label', 'flex items-center gap-2 text-sm text-slate-700')
    const casilla = elemento('input', 'h-4 w-4 accent-brand-strong')
    casilla.type = 'checkbox'
    casilla.name = 'cobertura'
    casilla.value = os.id
    casilla.checked = marcadas.has(os.id)
    etiqueta.append(casilla, os.activa ? os.nombre : `${os.nombre} (desactivada)`)
    return etiqueta
  }))
  porId('sin-obras-sociales').hidden = visibles.length > 0
}

function marcarCoberturas(marcar) {
  porId('coberturas').querySelectorAll('input[name="cobertura"]').forEach((casilla) => {
    casilla.checked = marcar
  })
}

function limpiarFormPractica() {
  practicaEditada = null
  practica.tipo.value = 'CONSULTA'
  practica.nombre.value = ''
  practica.duracion.value = agenda?.pasoMinutos ?? 20
  practica.activa.checked = true
  porId('campo-practica-activa').hidden = true
  porId('titulo-form-practica').textContent = 'Agregar una consulta o práctica'
  porId('guardar-practica').textContent = 'Agregar'
  delete porId('guardar-practica').dataset.textoOriginal
  porId('cancelar-practica').hidden = true
  dibujarCoberturas(new Set())
}

function editarPractica(datos) {
  practicaEditada = datos
  practica.tipo.value = datos.tipo
  practica.nombre.value = datos.nombre
  practica.duracion.value = datos.duracionMinutos
  practica.activa.checked = datos.activa
  porId('campo-practica-activa').hidden = false
  porId('titulo-form-practica').textContent = `Editar ${datos.nombre}`
  porId('guardar-practica').textContent = 'Guardar cambios'
  delete porId('guardar-practica').dataset.textoOriginal
  porId('cancelar-practica').hidden = false
  dibujarCoberturas(new Set(datos.obrasSociales))
  porId('form-practica').scrollIntoView({ behavior: 'smooth', block: 'center' })
}

porId('form-practica').addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const datos = {
    tipo: practica.tipo.value,
    nombre: practica.nombre.value.trim(),
    duracionMinutos: Number(practica.duracion.value),
    activa: practicaEditada ? practica.activa.checked : true,
    obrasSociales: [...porId('coberturas').querySelectorAll('input[name="cobertura"]:checked')].map((c) => Number(c.value)),
  }
  let problema = null
  if (!datos.nombre) problema = 'Escribí el nombre.'
  else if (!Number.isInteger(datos.duracionMinutos) || datos.duracionMinutos < 5 || datos.duracionMinutos > 720) problema = 'La duración tiene que ser de 5 a 720 minutos.'
  if (problema) {
    avisar('error-practica', problema, 'exito-practicas')
    return
  }
  const guardar = porId('guardar-practica')
  marcarEnviando(guardar, true, 'Guardando…')
  try {
    if (practicaEditada) {
      await actualizarPractica(agendaId, practicaEditada.id, datos)
    } else {
      await agregarPractica(agendaId, datos)
    }
    avisar('exito-practicas', practicaEditada ? `Se guardó ${datos.nombre}.` : `Se agregó ${datos.nombre}.`, 'error-practica')
    marcarEnviando(guardar, false)
    limpiarFormPractica()
    await recargar()
  } catch (err) {
    avisar('error-practica', mensajeDeError(err), 'exito-practicas')
    marcarEnviando(guardar, false)
  }
})

porId('marcar-todas').addEventListener('click', () => marcarCoberturas(true))
porId('desmarcar-todas').addEventListener('click', () => marcarCoberturas(false))
porId('cancelar-practica').addEventListener('click', limpiarFormPractica)

// Inicio

const sesion = await exigirSesion('configurar-agenda', rolesDe('agendas'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'agendas')
  if (!agendaId) {
    location.replace('agendas.html')
  } else {
    regla.dia.replaceChildren(...DIAS_SEMANA.map((dia, indice) => opcion(indice + 1, dia)))
    try {
      obrasSociales = await listarObrasSociales()
      await cargar()
      porId('aviso-nueva').hidden = !parametro('nueva')
      limpiarFormRegla()
      limpiarFormExcepcion()
      limpiarFormPractica()
      porId('dia-consulta').value = hoy()
      await mostrarDia()
    } catch (err) {
      mostrarError(porId('error-general'), mensajeDeError(err))
    }
  }
}
