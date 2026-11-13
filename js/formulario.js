// Ayudas compartidas por los formularios del portal.

/** Muestra (o limpia, con null) el mensaje de error del formulario. */
export function mostrarError(elemento, mensaje) {
  elemento.textContent = mensaje ?? ''
  elemento.hidden = !mensaje
}

/**
 * Lleva un teléfono al formato que guarda el backend (E.164, D42): +549 + código de área + número.
 * '2657 12-3456' y '5492657123456' quedan '+5492657123456'. Lo que no reconoce lo deja como está y el backend avisa.
 */
export function normalizarTelefono(texto) {
  let limpio = texto.replace(/[\s\-().]/g, '')
  if (limpio.startsWith('00')) limpio = `+${limpio.slice(2)}`
  if (limpio.startsWith('+')) return limpio
  if (/^\d{10}$/.test(limpio)) return `+549${limpio}`
  if (/^549\d{10}$/.test(limpio)) return `+${limpio}`
  return limpio
}

/** Deshabilita el botón mientras se envía y muestra un texto de progreso. */
export function marcarEnviando(boton, enviando, textoEnviando) {
  if (!boton.dataset.textoOriginal) boton.dataset.textoOriginal = boton.textContent
  boton.disabled = enviando
  boton.textContent = enviando ? textoEnviando : boton.dataset.textoOriginal
}
