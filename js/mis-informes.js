// Portal del paciente: sus informes en PDF para ver o descargar (D65).
import { mensajeDeError } from './api.js'
import { fechaLarga } from './fechas.js'
import { mostrarError } from './formulario.js'
import { misInformes, urlMiInforme } from './informe.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { detalle, elemento, enlaceBoton, tamanioLegible } from './vista.js'

function tarjeta(informe) {
  const item = elemento('li', 'tarjeta')
  item.append(
    elemento('h2', 'text-lg font-medium text-slate-900', informe.titulo),
    detalle(fechaLarga(informe.fechaEstudio)),
  )
  // Al paciente le dice más con quién se atendió que quién subió el archivo
  const origen = informe.turnoAgenda ? `${informe.turnoPractica} con ${informe.turnoAgenda}` : `Cargado por ${informe.cargadoPor}`
  item.append(elemento('p', 'mt-2 text-sm text-slate-600', origen))
  if (informe.descripcion) item.append(elemento('p', 'mt-2 text-slate-700', informe.descripcion))
  const acciones = elemento('div', 'mt-4 flex flex-wrap items-center gap-2')
  acciones.append(
    enlaceBoton('Ver', urlMiInforme(informe.id), 'boton'),
    enlaceBoton('Descargar', urlMiInforme(informe.id, true)),
    elemento('span', 'text-xs text-slate-500', `PDF · ${tamanioLegible(informe.tamanioBytes)}`),
  )
  item.append(acciones)
  return item
}

const sesion = await exigirSesion('mis-informes', rolesDe('mis-informes'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'mis-informes')
  try {
    const informes = await misInformes()
    document.getElementById('lista').replaceChildren(...informes.map(tarjeta))
    document.getElementById('vacio').hidden = informes.length > 0
  } catch (err) {
    mostrarError(document.getElementById('error'), mensajeDeError(err))
  }
}
