// Mi agenda (profesional): los turnos de su agenda día por día, solo para ver, con acceso a los informes de cada paciente.
import { mensajeDeError } from './api.js'
import { ESTADOS_TURNO, insigniaEstado } from './estado-turno.js'
import { fechaLarga, hora, hoy, sumarDias } from './fechas.js'
import { mostrarError } from './formulario.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { miAgendaDelDia } from './turno.js'
import { celda, detalle, elemento, insignia, parametro } from './vista.js'

const TIPOS_DOCUMENTO = { DNI: 'DNI', PASAPORTE: 'Pasaporte', OTRO: 'Doc.' }

const porId = (id) => document.getElementById(id)

let fecha = hoy()
let dia = null

const nombrePaciente = (paciente) => (paciente ? `${paciente.apellido}, ${paciente.nombre}` : 'Paciente nuevo (solicitud online)')

async function cambiarFecha(nueva) {
  if (!nueva) return
  fecha = nueva
  porId('fecha').value = fecha
  await cargarDia()
}

async function cargarDia() {
  history.replaceState(null, '', `?fecha=${fecha}`)
  mostrarError(porId('error-general'), null)
  try {
    dia = await miAgendaDelDia(fecha)
  } catch (err) {
    porId('area-trabajo').hidden = true
    mostrarError(porId('error-general'), mensajeDeError(err))
    return
  }
  porId('area-trabajo').hidden = false
  porId('nombre-agenda').textContent = dia.agenda.nombre
  dibujarDia()
}

function dibujarDia() {
  porId('titulo-dia').textContent = fechaLarga(fecha)
  porId('franjas-dia').textContent = dia.franjas.length
    ? `Atendés ${dia.franjas.map((f) => `de ${hora(f.inicio)} a ${hora(f.fin)}`).join(' y ')}.`
    : 'Ese día no atendés.'

  const mostrarCancelados = porId('mostrar-cancelados').checked
  const visibles = dia.turnos.filter((turno) => mostrarCancelados || turno.estado !== 'CANCELADO')
  porId('filas').replaceChildren(...visibles.map(fila))
  porId('vacio').hidden = visibles.length > 0

  // Resumen del día: cuántos turnos hay en cada estado (sin contar los cancelados)
  const cuentas = {}
  for (const turno of dia.turnos.filter((t) => t.estado !== 'CANCELADO')) cuentas[turno.estado] = (cuentas[turno.estado] ?? 0) + 1
  porId('resumen').replaceChildren(...Object.entries(cuentas).map(([estado, cantidad]) =>
    insignia(`${cantidad} ${ESTADOS_TURNO[estado].texto.toLowerCase()}${cantidad === 1 ? '' : 's'}`, ESTADOS_TURNO[estado].tono)))
}

function fila(turno) {
  const tr = elemento('tr', turno.estado === 'CANCELADO' ? 'text-slate-400' : '')
  const marcas = [
    turno.sobreturno ? insignia('Sobreturno', 'ambar') : null,
    turno.primeraVez ? insignia('Primera vez', 'azul') : null,
    turno.modalidad === 'VIDEOLLAMADA' ? insignia('Videollamada', 'azul') : null,
  ].filter(Boolean)
  const contenedorMarcas = marcas.length ? elemento('div', 'mt-1 flex flex-wrap gap-1') : null
  contenedorMarcas?.append(...marcas)

  const { paciente } = turno
  let informes = null
  if (paciente) {
    informes = elemento('a', 'boton-secundario', 'Informes')
    informes.href = `informes.html?paciente=${paciente.id}`
  }
  tr.append(
    celda([elemento('span', 'whitespace-nowrap font-medium', `${hora(turno.inicio)}–${hora(turno.fin)}`), contenedorMarcas]),
    celda(paciente
      ? [elemento('span', 'font-medium', nombrePaciente(paciente)),
        detalle(`${TIPOS_DOCUMENTO[paciente.tipoDocumento]} ${paciente.numeroDocumento}`)]
      : nombrePaciente(null)),
    celda([turno.practica, turno.motivo ? detalle(turno.motivo) : null]),
    celda(turno.obraSocial ?? 'Particular'),
    celda(insigniaEstado(turno.estado)),
    celda(informes, 'text-right'),
  )
  return tr
}

porId('fecha').addEventListener('change', (evento) => cambiarFecha(evento.target.value))
porId('dia-anterior').addEventListener('click', () => cambiarFecha(sumarDias(fecha, -1)))
porId('dia-siguiente').addEventListener('click', () => cambiarFecha(sumarDias(fecha, 1)))
porId('dia-hoy').addEventListener('click', () => cambiarFecha(hoy()))
porId('mostrar-cancelados').addEventListener('change', () => dia && dibujarDia())

const sesion = await exigirSesion('mi-agenda', rolesDe('mi-agenda'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'mi-agenda')
  fecha = parametro('fecha') || hoy()
  porId('fecha').value = fecha
  await cargarDia()
}
