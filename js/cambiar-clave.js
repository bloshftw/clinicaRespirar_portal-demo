import { mensajeDeError } from './api.js'
import { cambiarPassword } from './auth.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { exigirSesion } from './sesion.js'

/** Mismo mínimo que el backend (respirar.seguridad.largo-minimo-password); el backend vuelve a validarlo. */
const LARGO_MINIMO = 8

const formulario = document.getElementById('formulario')
const actual = document.getElementById('actual')
const nueva = document.getElementById('nueva')
const repetida = document.getElementById('repetida')
const error = document.getElementById('error')
const boton = document.getElementById('enviar')

function validar() {
  if (!actual.value || !nueva.value || !repetida.value) return 'Completá los tres campos.'
  if (nueva.value.length < LARGO_MINIMO) return `La contraseña nueva debe tener al menos ${LARGO_MINIMO} caracteres.`
  if (nueva.value !== repetida.value) return 'Las contraseñas nuevas no coinciden.'
  if (nueva.value === actual.value) return 'La contraseña nueva debe ser distinta de la actual.'
  return null
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  const problema = validar()
  if (problema) {
    mostrarError(error, problema)
    return
  }
  mostrarError(error, null)
  marcarEnviando(boton, true, 'Guardando…')
  try {
    await cambiarPassword(actual.value, nueva.value)
    location.replace('index.html')
  } catch (err) {
    mostrarError(error, mensajeDeError(err))
    marcarEnviando(boton, false)
  }
})

const sesion = await exigirSesion('cambiar-clave')
// Con el token restringido (D10) es el primer ingreso: la clave inicial se reemplaza antes de seguir
if (sesion?.estado === 'restringida') {
  document.getElementById('titulo').textContent = 'Elegí tu contraseña'
  document.getElementById('aviso-primer-ingreso').hidden = false
  document.getElementById('ayuda-actual').hidden = false
}
