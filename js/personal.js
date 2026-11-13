// Panel del ADMIN: alta de cuentas del personal, reseteo de clave y desbloqueo (D8, D9, D16).
import { crearCuentaPersonal, desbloquear, listarPersonal, resetearClave } from './admin.js'
import { mensajeDeError } from './api.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { nombreRol } from './roles.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'

const formulario = document.getElementById('formulario')
const dni = document.getElementById('dni')
const nombre = document.getElementById('nombre')
const apellido = document.getElementById('apellido')
const error = document.getElementById('error')
const exito = document.getElementById('exito')
const botonCrear = document.getElementById('crear')
const filas = document.getElementById('filas')
const vacio = document.getElementById('vacio')
const mensajeLista = document.getElementById('mensaje-lista')
const errorLista = document.getElementById('error-lista')

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  mostrarError(exito, null)
  const roles = [...formulario.querySelectorAll('input[name="rol"]:checked')].map((casilla) => casilla.value)
  const datos = {
    dni: dni.value.replace(/[.\s]/g, ''),
    nombre: nombre.value.trim(),
    apellido: apellido.value.trim(),
    roles,
  }
  const problema = validar(datos)
  if (problema) {
    mostrarError(error, problema)
    return
  }
  mostrarError(error, null)
  marcarEnviando(botonCrear, true, 'Creando…')
  try {
    const cuenta = await crearCuentaPersonal(datos)
    formulario.reset()
    mostrarError(exito, `Cuenta creada para ${cuenta.nombre} ${cuenta.apellido}. Ingresa con su DNI como contraseña y debe cambiarla.`)
    await cargarLista()
  } catch (err) {
    mostrarError(error, mensajeDeError(err))
  } finally {
    marcarEnviando(botonCrear, false)
  }
})

function validar(datos) {
  if (!/^\d{7,8}$/.test(datos.dni)) return 'El DNI debe tener 7 u 8 dígitos.'
  if (!datos.nombre || !datos.apellido) return 'Completá el nombre y el apellido.'
  if (datos.roles.length === 0) return 'Elegí al menos un rol.'
  return null
}

async function cargarLista() {
  mostrarError(errorLista, null)
  try {
    mostrarCuentas(await listarPersonal())
  } catch (err) {
    mostrarError(errorLista, mensajeDeError(err))
  }
}

// Las filas se arman con createElement y textContent: los datos de la API nunca se interpretan como HTML
function mostrarCuentas(cuentas) {
  filas.replaceChildren(...cuentas.map(fila))
  vacio.hidden = cuentas.length > 0
}

function fila(cuenta) {
  const tr = document.createElement('tr')
  tr.append(
    celda(nombreCompleto(cuenta), 'font-medium text-slate-900'),
    celda(cuenta.dni, 'text-slate-600'),
    celda(cuenta.roles.map(nombreRol).join(', '), 'text-slate-600'),
    celdaEstado(cuenta),
    celdaAcciones(cuenta),
  )
  return tr
}

/** "Apellido, Nombre"; las cuentas creadas antes de la V2 pueden no tener nombre. */
function nombreCompleto(cuenta) {
  const partes = [cuenta.apellido, cuenta.nombre].filter(Boolean)
  return partes.length > 0 ? partes.join(', ') : 'Sin nombre'
}

function celda(texto, clases) {
  const td = document.createElement('td')
  td.className = `py-3 pr-4 ${clases}`
  td.textContent = texto
  return td
}

function celdaEstado(cuenta) {
  const td = document.createElement('td')
  td.className = 'py-3 pr-4'
  const [texto, clases] = estado(cuenta)
  const etiqueta = document.createElement('span')
  etiqueta.className = `rounded-full px-2.5 py-0.5 text-xs font-medium ${clases}`
  etiqueta.textContent = texto
  td.append(etiqueta)
  return td
}

function estado(cuenta) {
  if (!cuenta.activa) return ['Inactiva', 'bg-slate-100 text-slate-600']
  if (cuenta.bloqueada) return ['Bloqueada', 'bg-red-50 text-red-700']
  if (cuenta.debeCambiarPassword) return ['Debe cambiar la clave', 'bg-amber-50 text-amber-800']
  return ['Activa', 'bg-green-50 text-green-800']
}

function celdaAcciones(cuenta) {
  const td = document.createElement('td')
  td.className = 'py-3 text-right whitespace-nowrap'
  if (cuenta.bloqueada) {
    td.append(boton('Desbloquear', async () => {
      await desbloquear(cuenta.id)
      return `Cuenta de ${cuenta.nombre ?? cuenta.dni} desbloqueada.`
    }))
  }
  td.append(boton('Resetear clave', async () => {
    const quien = cuenta.nombre ? `${cuenta.nombre} ${cuenta.apellido}` : cuenta.dni
    if (!confirm(`¿Resetear la clave de ${quien}? Va a volver a ser su DNI y se cerrarán sus sesiones abiertas.`)) return null
    await resetearClave(cuenta.id)
    return `Clave de ${quien} reseteada: ahora es su DNI y debe cambiarla al ingresar.`
  }))
  return td
}

function boton(texto, accion) {
  const elemento = document.createElement('button')
  elemento.type = 'button'
  elemento.className = 'ml-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60'
  elemento.textContent = texto
  elemento.addEventListener('click', async () => {
    mostrarError(mensajeLista, null)
    mostrarError(errorLista, null)
    elemento.disabled = true
    try {
      const mensaje = await accion()
      if (mensaje) {
        mostrarError(mensajeLista, mensaje)
        await cargarLista()
      }
    } catch (err) {
      mostrarError(errorLista, mensajeDeError(err))
    } finally {
      elemento.disabled = false
    }
  })
  return elemento
}

const sesion = await exigirSesion('personal', rolesDe('personal'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'personal')
  await cargarLista()
}
