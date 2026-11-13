// La cookie de sesión es HttpOnly: el portal no puede leerla. El estado se deduce de GET /api/auth/yo:
// 200 = activa, 403 = restringida (solo puede cambiar la clave, D10), 401 = anónima.
import { ErrorApi } from './api.js'
import { obtenerUsuarioActual } from './auth.js'

export async function consultarSesion() {
  try {
    return { estado: 'activa', usuario: await obtenerUsuarioActual() }
  } catch (error) {
    if (error instanceof ErrorApi && error.status === 403) return { estado: 'restringida' }
    if (error instanceof ErrorApi && error.status === 401) return { estado: 'anonima' }
    return { estado: 'sin-conexion' }
  }
}

// Qué estados admite cada página y adónde va cada estado que no admite
const PERMITIDOS = {
  login: ['anonima'],
  'cambiar-clave': ['activa', 'restringida'],
  inicio: ['activa'],
  personal: ['activa'],
  turnos: ['activa'],
  pacientes: ['activa'],
  agendas: ['activa'],
  'configurar-agenda': ['activa'],
  profesionales: ['activa'],
  catalogos: ['activa'],
  informes: ['activa'],
  'mis-informes': ['activa'],
  'mi-agenda': ['activa'],
}

const DESTINO = {
  anonima: 'login.html',
  restringida: 'cambiar-clave.html',
  activa: 'index.html',
}

/**
 * Verifica que la sesión permita ver la página. Si no, redirige y devuelve null.
 * Si la permite, muestra el contenido (que arranca oculto para no mostrarlo antes de verificar).
 * roles: si se indican, el usuario tiene que tener alguno; si no, vuelve al inicio. El backend igual lo controla.
 */
export async function exigirSesion(pagina, roles) {
  const sesion = await consultarSesion()
  if (sesion.estado === 'sin-conexion') {
    mostrarSinConexion()
    return null
  }
  if (!PERMITIDOS[pagina].includes(sesion.estado)) {
    location.replace(DESTINO[sesion.estado])
    return null
  }
  if (roles && !sesion.usuario.roles.some((rol) => roles.includes(rol))) {
    location.replace('index.html')
    return null
  }
  document.getElementById('cargando').hidden = true
  document.getElementById('contenido').hidden = false
  return sesion
}

function mostrarSinConexion() {
  const cargando = document.getElementById('cargando')
  cargando.textContent = 'No se pudo conectar con el sistema. Revisá tu conexión y probá de nuevo.'
  cargando.setAttribute('role', 'alert')
  const boton = document.createElement('button')
  boton.type = 'button'
  boton.textContent = 'Reintentar'
  boton.className = 'mt-4 block mx-auto rounded-lg border border-brand-strong px-4 py-2 font-medium text-brand-strong hover:bg-brand/10'
  boton.addEventListener('click', () => location.reload())
  cargando.append(boton)
}
