import { mensajeDeError } from './api.js'
import { login } from './auth.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { exigirSesion } from './sesion.js'

const formulario = document.getElementById('formulario')
const documento = document.getElementById('documento')
const password = document.getElementById('password')
const error = document.getElementById('error')
const boton = document.getElementById('enviar')

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault()
  // Mucha gente escribe el DNI con puntos: se quitan puntos y espacios
  const numero = documento.value.replace(/[.\s]/g, '')
  if (!numero || !password.value) {
    mostrarError(error, 'Completá tu número de documento y tu contraseña.')
    return
  }
  mostrarError(error, null)
  marcarEnviando(boton, true, 'Ingresando…')
  try {
    const sesion = await login(numero, password.value)
    location.replace(sesion.tipo === 'RESTRINGIDO' ? 'cambiar-clave.html' : 'index.html')
  } catch (err) {
    mostrarError(error, mensajeDeError(err))
    marcarEnviando(boton, false)
  }
})

await exigirSesion('login')
