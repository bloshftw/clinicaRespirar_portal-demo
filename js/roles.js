// Nombres de los roles para mostrar en pantalla (backend: entity/acceso/Rol).
export const NOMBRES_ROL = {
  PACIENTE: 'Paciente',
  PROFESIONAL: 'Profesional',
  SECRETARIA: 'Secretaría',
  LABORATORIO: 'Laboratorio',
  ADMIN: 'Administración',
}

export function nombreRol(rol) {
  return NOMBRES_ROL[rol] ?? rol
}
