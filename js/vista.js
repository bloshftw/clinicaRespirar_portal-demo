// Ayudas para armar la interfaz con createElement y textContent: los datos de la API nunca se interpretan como HTML.

/** Crea un elemento con sus clases y, si se indica, su texto. */
export function elemento(etiqueta, clases = '', texto) {
  const nuevo = document.createElement(etiqueta)
  if (clases) nuevo.className = clases
  if (texto !== undefined && texto !== null) nuevo.textContent = texto
  return nuevo
}

/** Botón que no envía formularios. */
export function boton(texto, clases, alHacerClic) {
  const nuevo = elemento('button', clases, texto)
  nuevo.type = 'button'
  if (alHacerClic) nuevo.addEventListener('click', alHacerClic)
  return nuevo
}

/** Celda de tabla con texto, un elemento o una lista de ellos. */
export function celda(contenido, clases = '') {
  const td = elemento('td', clases)
  const partes = Array.isArray(contenido) ? contenido : [contenido]
  td.append(...partes.filter((parte) => parte !== null && parte !== undefined))
  return td
}

export function opcion(valor, texto, seleccionada = false) {
  const nueva = elemento('option', '', texto)
  nueva.value = valor
  nueva.selected = seleccionada
  return nueva
}

const TONOS = {
  verde: 'bg-green-50 text-green-800 ring-green-200',
  gris: 'bg-slate-100 text-slate-600 ring-slate-200',
  rojo: 'bg-red-50 text-red-700 ring-red-200',
  ambar: 'bg-amber-50 text-amber-800 ring-amber-200',
  azul: 'bg-brand/10 text-brand-dark ring-brand/20',
}

/** Etiqueta chica de estado. tono: verde, gris, rojo, ambar o azul. */
export function insignia(texto, tono = 'gris') {
  return elemento('span', `inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${TONOS[tono]}`, texto)
}

/** Texto secundario debajo de un dato (documento, teléfono). */
export function detalle(texto) {
  return elemento('span', 'block text-xs text-slate-500', texto)
}

/** Ejecuta una acción de un botón: lo deshabilita mientras tanto y muestra el error si falla. */
export async function conBoton(botonAccion, accion, mostrarFallo) {
  botonAccion.disabled = true
  try {
    await accion()
  } catch (error) {
    mostrarFallo(error)
  } finally {
    botonAccion.disabled = false
  }
}

/** '245 KB' o '1,2 MB'. */
export function tamanioLegible(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('es-AR', { maximumFractionDigits: 1 })} MB`
}

/** Enlace que parece botón, por ejemplo para abrir o descargar un PDF en otra pestaña. */
export function enlaceBoton(texto, href, clases = 'boton-secundario') {
  const enlace = elemento('a', clases, texto)
  enlace.href = href
  enlace.target = '_blank'
  enlace.rel = 'noopener'
  return enlace
}

/** Valor de un parámetro de la URL de la página (por ejemplo ?id=3). */
export function parametro(nombre) {
  return new URLSearchParams(location.search).get(nombre)
}
