// Cómo se muestra cada estado del turno (D23).
import { insignia } from './vista.js'

export const ESTADOS_TURNO = {
  PENDIENTE_CONFIRMACION: { texto: 'Pendiente', tono: 'ambar' },
  CONFIRMADO: { texto: 'Confirmado', tono: 'azul' },
  ATENDIDO: { texto: 'Atendido', tono: 'verde' },
  AUSENTE: { texto: 'Ausente', tono: 'rojo' },
  CANCELADO: { texto: 'Cancelado', tono: 'gris' },
}

export function nombreEstado(estado) {
  return ESTADOS_TURNO[estado]?.texto ?? estado
}

export function insigniaEstado(estado) {
  return insignia(nombreEstado(estado), ESTADOS_TURNO[estado]?.tono)
}
