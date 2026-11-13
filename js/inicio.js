// Punto de partida: saludo, roles y accesos a las secciones que corresponden a cada rol.
import { logout } from './auth.js'
import { marcarEnviando } from './formulario.js'
import { nombreRol } from './roles.js'
import { mostrarMenu, seccionesPara } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { elemento } from './vista.js'

const botonSalir = document.getElementById('salir')

botonSalir.addEventListener('click', async () => {
  marcarEnviando(botonSalir, true, 'Saliendo…')
  try {
    await logout()
  } finally {
    location.replace('login.html')
  }
})

function acceso(seccion) {
  const enlace = elemento('a', 'tarjeta block transition hover:ring-brand')
  enlace.href = seccion.archivo
  enlace.append(
    elemento('span', 'mb-1 block text-lg font-medium text-brand-strong', seccion.titulo),
    elemento('span', 'block text-sm text-slate-600', seccion.descripcion),
  )
  return enlace
}

const sesion = await exigirSesion('inicio')
if (sesion) {
  const { nombre, roles } = sesion.usuario
  if (nombre) document.getElementById('saludo').textContent = `Hola, ${nombre}`
  mostrarMenu(roles, null)

  const lista = document.getElementById('roles')
  for (const rol of roles) {
    // textContent y no innerHTML: los datos que vienen de la API nunca se interpretan como HTML
    lista.append(elemento('li', 'rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand-dark', nombreRol(rol)))
  }

  const secciones = seccionesPara(roles)
  document.getElementById('accesos').replaceChildren(...secciones.map(acceso))
  document.getElementById('sin-accesos').hidden = secciones.length > 0
}
