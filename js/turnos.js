// Turnos de la secretaría (D21 a D26): el día de una agenda, dar turno o sobreturno, cancelar, marcar y reprogramar.
import { listarAgendas, obtenerAgenda } from './agenda.js'
import { mensajeDeError } from './api.js'
import { insigniaEstado, nombreEstado } from './estado-turno.js'
import { diaDeLaSemana, fechaCorta, fechaLarga, hora, hoy, sumarDias } from './fechas.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { listarObrasSociales } from './obrasocial.js'
import { buscarPacientes } from './persona.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import {
  cancelarTurno, darTurno, diaDeAgenda, disponibilidad, historialDelTurno, marcarAtendido, marcarAusente,
  reprogramarTurno,
} from './turno.js'
import { boton, celda, conBoton, detalle, elemento, insignia, opcion, parametro } from './vista.js'

const TIPOS_DOCUMENTO = { DNI: 'DNI', PASAPORTE: 'Pasaporte', OTRO: 'Doc.' }
const SE_PUEDEN_CANCELAR = ['PENDIENTE_CONFIRMACION', 'CONFIRMADO']

const porId = (id) => document.getElementById(id)
const errorDia = porId('error-dia')
const errorTurno = porId('error-turno')

/** Lo que se está viendo y eligiendo en la pantalla. */
const pantalla = {
  agendas: [],
  obrasSociales: [],
  agenda: null,
  fecha: hoy(),
  dia: null,
  horarios: [],
  horario: null,
  paciente: null,
  reprogramando: null,
  horariosNuevos: [],
  horarioNuevo: null,
}

function avisarDia(texto) {
  mostrarError(errorDia, null)
  mostrarError(porId('mensaje'), texto)
}

function fallarDia(err) {
  mostrarError(porId('mensaje'), null)
  mostrarError(errorDia, mensajeDeError(err))
}

function nombrePaciente(paciente) {
  return paciente ? `${paciente.apellido}, ${paciente.nombre}` : 'Paciente nuevo (solicitud online)'
}

// Agenda y día

async function iniciar() {
  const [agendas, obrasSociales] = await Promise.all([listarAgendas(), listarObrasSociales()])
  pantalla.agendas = agendas.filter((agenda) => agenda.activa)
  pantalla.obrasSociales = obrasSociales
  if (!pantalla.agendas.length) {
    porId('sin-agendas').hidden = false
    porId('area-trabajo').hidden = true
    return
  }
  porId('agenda').replaceChildren(...pantalla.agendas.map((agenda) => opcion(agenda.id, agenda.nombre)))
  // La URL recuerda agenda y día: al recargar la página se vuelve al mismo lugar
  const agendaPedida = Number(parametro('agenda'))
  if (pantalla.agendas.some((agenda) => agenda.id === agendaPedida)) porId('agenda').value = agendaPedida
  pantalla.fecha = parametro('fecha') || hoy()
  porId('fecha').value = pantalla.fecha
  await elegirAgenda()
}

async function elegirAgenda() {
  try {
    pantalla.agenda = await obtenerAgenda(Number(porId('agenda').value))
  } catch (err) {
    fallarDia(err)
    return
  }
  llenarPracticas()
  volverADarTurno()
  await cargarDia()
}

async function cambiarFecha(fecha) {
  if (!fecha) return
  pantalla.fecha = fecha
  porId('fecha').value = fecha
  await cargarDia()
}

async function cargarDia() {
  history.replaceState(null, '', `?agenda=${pantalla.agenda.id}&fecha=${pantalla.fecha}`)
  mostrarError(errorDia, null)
  try {
    pantalla.dia = await diaDeAgenda(pantalla.agenda.id, pantalla.fecha)
  } catch (err) {
    fallarDia(err)
    return
  }
  dibujarDia()
  await cargarHorarios()
}

function dibujarDia() {
  const { dia } = pantalla
  porId('titulo-dia').textContent = fechaLarga(pantalla.fecha)
  porId('fecha-turno').textContent = `Para el ${diaDeLaSemana(pantalla.fecha)} ${fechaCorta(pantalla.fecha)} en ${pantalla.agenda.nombre}.`
  porId('franjas-dia').textContent = dia.franjas.length
    ? `Atiende ${dia.franjas.map((f) => `de ${hora(f.inicio)} a ${hora(f.fin)}`).join(' y ')}. Grilla cada ${dia.pasoMinutos} minutos.`
    : 'Ese día la agenda no atiende.'

  const mostrarCancelados = porId('mostrar-cancelados').checked
  const visibles = dia.turnos.filter((turno) => mostrarCancelados || turno.estado !== 'CANCELADO')
  porId('filas').replaceChildren(...visibles.map(filaTurno))
  const cancelados = dia.turnos.length - visibles.length
  const vacio = porId('vacio')
  vacio.hidden = visibles.length > 0
  vacio.textContent = cancelados > 0
    ? `No hay turnos activos este día (${cancelados} cancelado${cancelados === 1 ? '' : 's'}).`
    : 'No hay turnos este día.'
}

function filaTurno(turno) {
  const tr = elemento('tr', turno.estado === 'CANCELADO' ? 'text-slate-400' : '')
  const marcas = [
    turno.sobreturno ? insignia('Sobreturno', 'ambar') : null,
    turno.primeraVez ? insignia('Primera vez', 'azul') : null,
    turno.modalidad === 'VIDEOLLAMADA' ? insignia('Videollamada', 'azul') : null,
  ].filter(Boolean)
  const contenedorMarcas = marcas.length ? elemento('div', 'mt-1 flex flex-wrap gap-1') : null
  contenedorMarcas?.append(...marcas)
  const { paciente } = turno
  tr.append(
    celda([elemento('span', 'whitespace-nowrap font-medium', `${hora(turno.inicio)}–${hora(turno.fin)}`), contenedorMarcas]),
    celda(paciente
      ? [elemento('span', 'font-medium', nombrePaciente(paciente)),
        detalle(`${TIPOS_DOCUMENTO[paciente.tipoDocumento]} ${paciente.numeroDocumento} · ${paciente.telefono}`)]
      : nombrePaciente(null)),
    celda([turno.practica, turno.motivo ? detalle(turno.motivo) : null]),
    celda(turno.obraSocial ?? 'Particular'),
    celda(insigniaEstado(turno.estado)),
    celda(acciones(turno, tr)),
  )
  return tr
}

function acciones(turno, tr) {
  const contenedor = elemento('div', 'flex flex-wrap justify-end gap-1.5')
  // ATENDIDO y AUSENTE se marcan desde el día del turno (P12: los marca la secretaría)
  if (turno.estado === 'CONFIRMADO' && turno.inicio.slice(0, 10) <= hoy()) {
    contenedor.append(
      accion('Atendido', () => marcarAtendido(turno.id), `${nombrePaciente(turno.paciente)}: atendido.`),
      accion('Ausente', () => marcarAusente(turno.id), `${nombrePaciente(turno.paciente)}: ausente.`),
    )
  }
  if (SE_PUEDEN_CANCELAR.includes(turno.estado)) {
    const cancelar = boton('Cancelar', 'boton-peligro', () => cancelarConMotivo(turno, cancelar))
    contenedor.append(boton('Reprogramar', 'boton-secundario', () => empezarReprogramacion(turno)), cancelar)
  }
  const verHistorial = boton('Historial', 'boton-secundario', () => alternarHistorial(turno, tr, verHistorial))
  verHistorial.setAttribute('aria-expanded', 'false')
  contenedor.append(verHistorial)
  return contenedor
}

function accion(texto, operacion, mensajeExito) {
  const botonAccion = boton(texto, 'boton-secundario', () => conBoton(botonAccion, async () => {
    await operacion()
    avisarDia(mensajeExito)
    await cargarDia()
  }, fallarDia))
  return botonAccion
}

async function cancelarConMotivo(turno, botonCancelar) {
  const motivo = prompt(`Motivo de la cancelación del turno de ${nombrePaciente(turno.paciente)} (${hora(turno.inicio)}).\nPor ejemplo: avisó por WhatsApp.`)
  if (motivo === null) return
  await conBoton(botonCancelar, async () => {
    await cancelarTurno(turno.id, motivo)
    avisarDia(`Se canceló el turno de ${nombrePaciente(turno.paciente)}: el horario quedó libre.`)
    await cargarDia()
  }, fallarDia)
}

/** Abre o cierra, debajo del turno, quién cambió su estado, cuándo y por qué (D23). */
async function alternarHistorial(turno, tr, botonHistorial) {
  const siguiente = tr.nextElementSibling
  if (siguiente?.dataset.historialDe === String(turno.id)) {
    siguiente.remove()
    botonHistorial.setAttribute('aria-expanded', 'false')
    return
  }
  await conBoton(botonHistorial, async () => {
    const cambios = await historialDelTurno(turno.id)
    const fila = elemento('tr', 'bg-slate-50')
    fila.dataset.historialDe = String(turno.id)
    const lista = elemento('ul', 'space-y-1 text-xs text-slate-600')
    lista.append(...cambios.map((cambio) => elemento('li', '', [
      `${fechaCorta(cambio.fechaHora)} ${hora(cambio.fechaHora)}`,
      cambio.usuario,
      cambio.estadoAnterior ? `${nombreEstado(cambio.estadoAnterior)} → ${nombreEstado(cambio.estadoNuevo)}` : nombreEstado(cambio.estadoNuevo),
      cambio.motivo,
    ].filter(Boolean).join(' · '))))
    const contenido = celda(lista)
    contenido.colSpan = 6
    fila.append(contenido)
    tr.after(fila)
    botonHistorial.setAttribute('aria-expanded', 'true')
  }, fallarDia)
}

// Horarios (D21): botones con los horarios de la grilla; los ocupados solo se muestran para dar sobreturno (D22)

function claseHorario(libre, elegido) {
  if (elegido) return 'rounded-lg bg-brand-strong px-3 py-1.5 text-sm font-medium text-white ring-1 ring-brand-strong'
  return libre
    ? 'rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-brand/10'
    : 'rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 ring-1 ring-amber-300 hover:bg-amber-100'
}

function dibujarHorarios({ contenedor, aviso, horarios, conOcupados, elegido, alElegir }) {
  const visibles = horarios.filter((horario) => horario.libre || conOcupados)
  contenedor.replaceChildren(...visibles.map((horario) => {
    const texto = hora(horario.hora)
    const botonHorario = boton(texto, claseHorario(horario.libre, texto === elegido), () => alElegir(texto))
    botonHorario.setAttribute('aria-pressed', String(texto === elegido))
    if (!horario.libre) botonHorario.title = 'Ocupado: se da como sobreturno'
    return botonHorario
  }))
  aviso.hidden = visibles.length > 0
  aviso.textContent = horarios.length === 0
    ? 'No hay horarios disponibles ese día para esta práctica.'
    : 'Todos los horarios están ocupados. Para darlo igual, marcá Sobreturno.'
}

// Dar turno

function practicaElegida() {
  return pantalla.agenda?.practicas.find((practica) => practica.id === Number(porId('practica').value))
}

function llenarPracticas() {
  const activas = pantalla.agenda.practicas.filter((practica) => practica.activa)
  const selector = porId('practica')
  selector.replaceChildren(...(activas.length
    ? activas.map((practica) => opcion(practica.id, `${practica.nombre} · ${practica.duracionMinutos} min`))
    : [opcion('', 'Esta agenda no tiene prácticas activas')]))
  selector.disabled = !activas.length
  llenarCoberturas()
}

async function cargarHorarios() {
  pantalla.horario = null
  pantalla.horarios = []
  const practica = practicaElegida()
  if (practica) {
    try {
      pantalla.horarios = await disponibilidad(pantalla.agenda.id, practica.id, pantalla.fecha)
    } catch (err) {
      mostrarError(errorTurno, mensajeDeError(err))
    }
  }
  dibujarHorariosTurno()
}

function dibujarHorariosTurno() {
  dibujarHorarios({
    contenedor: porId('horarios'),
    aviso: porId('sin-horarios'),
    horarios: pantalla.horarios,
    conOcupados: porId('sobreturno').checked,
    elegido: pantalla.horario,
    alElegir: (horario) => {
      pantalla.horario = horario
      dibujarHorariosTurno()
    },
  })
}

/** Particular y las obras sociales activas que cubren la práctica (D35). Propone la habitual del paciente si la cubre. */
function llenarCoberturas() {
  const practica = practicaElegida()
  const cubren = practica
    ? pantalla.obrasSociales.filter((os) => os.activa && practica.obrasSociales.includes(os.id))
    : []
  const habitual = pantalla.paciente?.obraSocialId ?? null
  porId('cobertura').replaceChildren(
    opcion('', 'Particular'),
    ...cubren.map((os) => opcion(os.id, os.nombre, os.id === habitual)),
  )
  const avisoCobertura = porId('aviso-cobertura')
  avisoCobertura.textContent = habitual && !cubren.some((os) => os.id === habitual)
    ? `${pantalla.paciente.obraSocial} no cubre esta práctica: queda particular, salvo que elijas otra.`
    : ''
}

async function buscarPaciente() {
  const texto = porId('texto-paciente').value.trim()
  if (!texto) return
  const resultados = porId('resultados-paciente')
  try {
    const encontrados = (await buscarPacientes(texto)).slice(0, 8)
    resultados.replaceChildren(...(encontrados.length
      ? encontrados.map((paciente) => {
        const item = elemento('li')
        const elegir = boton('', 'w-full px-3 py-2 text-left hover:bg-brand/10', () => elegirPaciente(paciente))
        elegir.append(
          elemento('span', 'block font-medium text-slate-900', nombrePaciente(paciente)),
          detalle(`${TIPOS_DOCUMENTO[paciente.tipoDocumento]} ${paciente.numeroDocumento} · ${paciente.obraSocial ?? 'Particular'}`),
        )
        item.append(elegir)
        return item
      })
      : [elemento('li', 'px-3 py-2 text-sm text-slate-500', 'No se encontró. Revisá el documento o cargalo en Pacientes.')]))
  } catch (err) {
    mostrarError(errorTurno, mensajeDeError(err))
  }
}

function elegirPaciente(paciente) {
  pantalla.paciente = paciente
  porId('nombre-paciente').textContent = `${nombrePaciente(paciente)} · ${TIPOS_DOCUMENTO[paciente.tipoDocumento]} ${paciente.numeroDocumento}`
  porId('paciente-elegido').hidden = false
  porId('buscar-paciente').hidden = true
  porId('resultados-paciente').replaceChildren()
  llenarCoberturas()
}

function cambiarPaciente() {
  pantalla.paciente = null
  porId('paciente-elegido').hidden = true
  porId('buscar-paciente').hidden = false
  porId('texto-paciente').value = ''
  llenarCoberturas()
}

porId('form-turno').addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const practica = practicaElegida()
  let problema = null
  if (!practica) problema = 'Elegí la consulta o práctica.'
  else if (!pantalla.horario) problema = 'Elegí un horario.'
  else if (!pantalla.paciente) problema = 'Buscá y elegí el paciente.'
  if (problema) {
    mostrarError(errorTurno, problema)
    return
  }
  mostrarError(errorTurno, null)
  const dar = porId('dar-turno')
  marcarEnviando(dar, true, 'Dando turno…')
  try {
    const turno = await darTurno({
      agendaId: pantalla.agenda.id,
      practicaId: practica.id,
      pacienteId: pantalla.paciente.id,
      inicio: `${pantalla.fecha}T${pantalla.horario}`,
      modalidad: porId('modalidad').value,
      primeraVez: porId('primera-vez').checked,
      motivo: porId('motivo').value.trim() || null,
      obraSocialId: porId('cobertura').value ? Number(porId('cobertura').value) : null,
      sobreturno: porId('sobreturno').checked,
    })
    avisarDia(`Turno dado: ${hora(turno.inicio)}, ${turno.practica}, ${nombrePaciente(turno.paciente)}${turno.sobreturno ? ' (sobreturno)' : ''}.`)
    cambiarPaciente()
    porId('motivo').value = ''
    porId('primera-vez').checked = false
    porId('modalidad').value = 'PRESENCIAL'
    porId('sobreturno').checked = false
    await cargarDia()
  } catch (err) {
    mostrarError(errorTurno, mensajeDeError(err))
  } finally {
    marcarEnviando(dar, false)
  }
})

// Reprogramar (D26): mismo paciente, práctica y cobertura en otro horario

function empezarReprogramacion(turno) {
  pantalla.reprogramando = turno
  pantalla.horarioNuevo = null
  porId('form-turno').hidden = true
  porId('form-reprogramar').hidden = false
  mostrarError(porId('error-reprogramar'), null)
  porId('turno-a-reprogramar').textContent = `${nombrePaciente(turno.paciente)} · ${turno.practica} · ${diaDeLaSemana(turno.inicio)} ${fechaCorta(turno.inicio)} a las ${hora(turno.inicio)}`
  const fecha = porId('fecha-reprogramar')
  fecha.min = hoy()
  fecha.value = turno.inicio.slice(0, 10) < hoy() ? hoy() : turno.inicio.slice(0, 10)
  porId('sobreturno-reprogramar').checked = false
  cargarHorariosReprogramar()
  porId('form-reprogramar').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function cargarHorariosReprogramar() {
  const turno = pantalla.reprogramando
  const fecha = porId('fecha-reprogramar').value
  pantalla.horarioNuevo = null
  pantalla.horariosNuevos = []
  if (turno && fecha) {
    try {
      pantalla.horariosNuevos = await disponibilidad(turno.agendaId, turno.practicaId, fecha)
    } catch (err) {
      mostrarError(porId('error-reprogramar'), mensajeDeError(err))
    }
  }
  dibujarHorariosReprogramar()
}

function dibujarHorariosReprogramar() {
  dibujarHorarios({
    contenedor: porId('horarios-reprogramar'),
    aviso: porId('sin-horarios-reprogramar'),
    horarios: pantalla.horariosNuevos,
    conOcupados: porId('sobreturno-reprogramar').checked,
    elegido: pantalla.horarioNuevo,
    alElegir: (horario) => {
      pantalla.horarioNuevo = horario
      dibujarHorariosReprogramar()
    },
  })
}

function volverADarTurno() {
  pantalla.reprogramando = null
  porId('form-reprogramar').hidden = true
  porId('form-turno').hidden = false
}

porId('form-reprogramar').addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const error = porId('error-reprogramar')
  if (!pantalla.horarioNuevo) {
    mostrarError(error, 'Elegí el nuevo horario.')
    return
  }
  mostrarError(error, null)
  const confirmar = porId('confirmar-reprogramar')
  marcarEnviando(confirmar, true, 'Reprogramando…')
  try {
    const fecha = porId('fecha-reprogramar').value
    const nuevo = await reprogramarTurno(pantalla.reprogramando.id, `${fecha}T${pantalla.horarioNuevo}`,
      porId('sobreturno-reprogramar').checked)
    avisarDia(`Turno reprogramado para el ${diaDeLaSemana(nuevo.inicio)} ${fechaCorta(nuevo.inicio)} a las ${hora(nuevo.inicio)}.`)
    volverADarTurno()
    await cargarDia()
  } catch (err) {
    mostrarError(error, mensajeDeError(err))
  } finally {
    marcarEnviando(confirmar, false)
  }
})

// Eventos

porId('agenda').addEventListener('change', elegirAgenda)
porId('fecha').addEventListener('change', (evento) => cambiarFecha(evento.target.value))
porId('dia-anterior').addEventListener('click', () => cambiarFecha(sumarDias(pantalla.fecha, -1)))
porId('dia-siguiente').addEventListener('click', () => cambiarFecha(sumarDias(pantalla.fecha, 1)))
porId('dia-hoy').addEventListener('click', () => cambiarFecha(hoy()))
porId('mostrar-cancelados').addEventListener('change', dibujarDia)
porId('practica').addEventListener('change', () => {
  llenarCoberturas()
  cargarHorarios()
})
porId('sobreturno').addEventListener('change', dibujarHorariosTurno)
porId('boton-buscar-paciente').addEventListener('click', buscarPaciente)
porId('texto-paciente').addEventListener('keydown', (evento) => {
  // Enter busca en lugar de enviar el formulario del turno
  if (evento.key === 'Enter') {
    evento.preventDefault()
    buscarPaciente()
  }
})
porId('cambiar-paciente').addEventListener('click', () => {
  cambiarPaciente()
  porId('texto-paciente').focus()
})
porId('fecha-reprogramar').addEventListener('change', cargarHorariosReprogramar)
porId('sobreturno-reprogramar').addEventListener('change', dibujarHorariosReprogramar)
porId('volver-reprogramar').addEventListener('click', volverADarTurno)

const sesion = await exigirSesion('turnos', rolesDe('turnos'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'turnos')
  try {
    await iniciar()
  } catch (err) {
    fallarDia(err)
  }
}
