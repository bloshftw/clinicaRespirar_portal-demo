// Informes en PDF (D65): elegir al paciente, ver sus informes, cargar uno nuevo y anular uno cargado por error.
import { mensajeDeError } from './api.js'
import { fechaCorta, hora, hoy } from './fechas.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { anularInforme, cargarInforme, informesDelPaciente, urlInforme } from './informe.js'
import { buscarPacientes, obtenerPaciente } from './persona.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { turnosDelPaciente } from './turno.js'
import { boton, conBoton, detalle, elemento, enlaceBoton, insignia, opcion, parametro, tamanioLegible } from './vista.js'

const TIPOS_DOCUMENTO = { DNI: 'DNI', PASAPORTE: 'Pasaporte', OTRO: 'Doc.' }
const TAMANIO_MAXIMO = 20 * 1024 * 1024
const TITULOS_FRECUENTES = ['Informe de consulta', 'Espirometría', 'Test de marcha de 6 minutos', 'DLCO',
  'Poligrafía respiratoria nocturna']

const porId = (id) => document.getElementById(id)
const campos = {
  turno: porId('turno'),
  titulo: porId('titulo'),
  fecha: porId('fecha-estudio'),
  descripcion: porId('descripcion'),
  archivo: porId('archivo'),
}

let paciente = null
let turnos = []

const nombrePaciente = (p) => `${p.apellido}, ${p.nombre}`

// Paciente

async function buscarPaciente(evento) {
  evento.preventDefault()
  const texto = porId('texto-paciente').value.trim()
  if (!texto) return
  mostrarError(porId('error-paciente'), null)
  try {
    const encontrados = (await buscarPacientes(texto)).slice(0, 8)
    porId('resultados-paciente').replaceChildren(...(encontrados.length
      ? encontrados.map((encontrado) => {
        const item = elemento('li')
        const elegir = boton('', 'w-full px-3 py-2 text-left hover:bg-brand/10', () => elegirPaciente(encontrado))
        elegir.append(
          elemento('span', 'block font-medium text-slate-900', nombrePaciente(encontrado)),
          detalle(`${TIPOS_DOCUMENTO[encontrado.tipoDocumento]} ${encontrado.numeroDocumento} · ${encontrado.edad} años`),
        )
        item.append(elegir)
        return item
      })
      : [elemento('li', 'px-3 py-2 text-sm text-slate-500', 'No se encontró ningún paciente con ese documento o apellido.')]))
  } catch (err) {
    mostrarError(porId('error-paciente'), mensajeDeError(err))
  }
}

async function elegirPaciente(elegido) {
  paciente = elegido
  porId('nombre-paciente').textContent = `${nombrePaciente(elegido)} · ${TIPOS_DOCUMENTO[elegido.tipoDocumento]} ${elegido.numeroDocumento}`
  porId('paciente-elegido').hidden = false
  porId('buscar-paciente').hidden = true
  porId('resultados-paciente').replaceChildren()
  porId('titulo-lista').textContent = `Informes de ${nombrePaciente(elegido)}`
  porId('area-paciente').hidden = false
  mostrarError(porId('mensaje'), null)
  history.replaceState(null, '', `?paciente=${elegido.id}`)
  limpiarFormulario()
  await Promise.all([cargarInformes(), cargarTurnos()])
}

function cambiarPaciente() {
  paciente = null
  porId('paciente-elegido').hidden = true
  porId('buscar-paciente').hidden = false
  porId('area-paciente').hidden = true
  porId('texto-paciente').value = ''
  porId('texto-paciente').focus()
  history.replaceState(null, '', location.pathname)
}

// Informes del paciente

async function cargarInformes() {
  mostrarError(porId('error-lista'), null)
  try {
    const informes = await informesDelPaciente(paciente.id)
    porId('lista').replaceChildren(...informes.map(itemInforme))
    porId('vacio').hidden = informes.length > 0
  } catch (err) {
    mostrarError(porId('error-lista'), mensajeDeError(err))
  }
}

function itemInforme(informe) {
  const item = elemento('li', `py-4 ${informe.anulado ? 'opacity-70' : ''}`)
  const encabezado = elemento('div', 'flex flex-wrap items-center gap-2')
  encabezado.append(elemento('span', 'font-medium text-slate-900', informe.titulo))
  if (informe.anulado) encabezado.append(insignia('Anulado', 'rojo'))
  item.append(
    encabezado,
    detalle(`Estudio del ${fechaCorta(informe.fechaEstudio)} · Cargado por ${informe.cargadoPor} el ${fechaCorta(informe.cargadoEn)} · ${tamanioLegible(informe.tamanioBytes)}`),
  )
  if (informe.turnoInicio) {
    item.append(detalle(`Turno del ${fechaCorta(informe.turnoInicio)} ${hora(informe.turnoInicio)} · ${informe.turnoPractica} · ${informe.turnoAgenda}`))
  }
  if (informe.descripcion) item.append(elemento('p', 'mt-1 text-sm text-slate-700', informe.descripcion))
  if (informe.anulado) {
    item.append(elemento('p', 'mt-1 text-sm text-red-700',
      `Anulado por ${informe.anuladoPor} el ${fechaCorta(informe.anuladoEn)}: ${informe.motivoAnulacion}. El paciente no lo ve.`))
  }
  const acciones = elemento('div', 'mt-2 flex flex-wrap gap-2')
  acciones.append(enlaceBoton('Ver', urlInforme(informe.id)), enlaceBoton('Descargar', urlInforme(informe.id, true)))
  if (informe.puedeAnular) {
    const anular = boton('Anular', 'boton-peligro', () => anularConMotivo(informe, anular))
    acciones.append(anular)
  }
  item.append(acciones)
  return item
}

async function anularConMotivo(informe, botonAnular) {
  const motivo = prompt(`Motivo de la anulación de "${informe.titulo}". El paciente deja de verlo.\nPor ejemplo: era de otro paciente.`)
  if (motivo === null) return
  await conBoton(botonAnular, async () => {
    await anularInforme(informe.id, motivo)
    mostrarError(porId('error-lista'), null)
    mostrarError(porId('mensaje'), `Se anuló "${informe.titulo}": el paciente ya no lo ve.`)
    await cargarInformes()
  }, (err) => mostrarError(porId('error-lista'), mensajeDeError(err)))
}

// Carga

async function cargarTurnos() {
  try {
    turnos = (await turnosDelPaciente(paciente.id)).filter((turno) => turno.estado !== 'CANCELADO')
  } catch {
    turnos = []
  }
  campos.turno.replaceChildren(
    opcion('', 'Sin turno'),
    ...turnos.map((turno) => opcion(turno.id, `${fechaCorta(turno.inicio)} ${hora(turno.inicio)} · ${turno.practica} · ${turno.agenda}`)),
  )
  const sugeridos = [...new Set([...turnos.map((turno) => turno.practica), ...TITULOS_FRECUENTES])]
  porId('titulos-sugeridos').replaceChildren(...sugeridos.map((titulo) => opcion(titulo, titulo)))
}

/** Al elegir el turno se proponen su práctica como título y su fecha como fecha del estudio. */
function alElegirTurno() {
  const turno = turnos.find((t) => t.id === Number(campos.turno.value))
  if (!turno) return
  if (!campos.titulo.value.trim()) campos.titulo.value = turno.practica
  const fechaTurno = turno.inicio.slice(0, 10)
  if (fechaTurno <= hoy()) campos.fecha.value = fechaTurno
}

function limpiarFormulario() {
  porId('formulario').reset()
  campos.fecha.value = hoy()
  campos.fecha.max = hoy()
  mostrarError(porId('error'), null)
}

function validar(archivo) {
  if (!campos.titulo.value.trim()) return 'Escribí el título del informe.'
  if (!campos.fecha.value) return 'Indicá la fecha del estudio.'
  if (campos.fecha.value > hoy()) return 'La fecha del estudio no puede ser posterior a hoy.'
  if (!archivo) return 'Elegí el archivo PDF del informe.'
  if (archivo.type !== 'application/pdf' && !archivo.name.toLowerCase().endsWith('.pdf')) return 'El archivo tiene que ser un PDF.'
  if (archivo.size > TAMANIO_MAXIMO) return 'El archivo supera el máximo de 20 MB.'
  return null
}

porId('formulario').addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const archivo = campos.archivo.files[0]
  const problema = validar(archivo)
  if (problema) {
    mostrarError(porId('error'), problema)
    return
  }
  mostrarError(porId('error'), null)
  const datos = new FormData()
  datos.append('pacienteId', paciente.id)
  if (campos.turno.value) datos.append('turnoId', campos.turno.value)
  datos.append('titulo', campos.titulo.value.trim())
  datos.append('fechaEstudio', campos.fecha.value)
  datos.append('descripcion', campos.descripcion.value.trim())
  datos.append('archivo', archivo)

  const cargar = porId('cargar')
  marcarEnviando(cargar, true, 'Cargando…')
  try {
    const informe = await cargarInforme(datos)
    mostrarError(porId('error-lista'), null)
    mostrarError(porId('mensaje'), `Se cargó "${informe.titulo}". ${nombrePaciente(paciente)} ya lo puede ver en su portal.`)
    limpiarFormulario()
    await cargarInformes()
  } catch (err) {
    mostrarError(porId('error'), mensajeDeError(err))
  } finally {
    marcarEnviando(cargar, false)
  }
})

porId('buscar-paciente').addEventListener('submit', buscarPaciente)
porId('cambiar-paciente').addEventListener('click', cambiarPaciente)
campos.turno.addEventListener('change', alElegirTurno)

const sesion = await exigirSesion('informes', rolesDe('informes'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'informes')
  // ?paciente=<id> abre directamente los informes de ese paciente
  const pacienteId = parametro('paciente')
  if (pacienteId) {
    try {
      await elegirPaciente(await obtenerPaciente(pacienteId))
    } catch (err) {
      mostrarError(porId('error-paciente'), mensajeDeError(err))
    }
  }
}
