// Servidor simulado de la demo: responde en el navegador lo mismo que respondería la API de Spring Boot
// (mismas rutas, mismas formas de respuesta, mismos mensajes de error), con datos ficticios guardados en localStorage.
// Es lo único que "responde" en este proyecto: no hay backend ni red.
import { ErrorApi } from '../error-api.js'
import { VERSION_DATOS, aHora, aMinutos, ahoraIso, crearDatos, desdeIso, franjasDelDia, hoyIso, tramoLibre } from './datos.js'

const CLAVE_DATOS = 'respirarDemo.datos'
const CLAVE_SESION = 'respirarDemo.sesion'
const ROLES_PERSONAL = ['SECRETARIA', 'LABORATORIO', 'ADMIN']

// Persistencia: los datos viven en este navegador y se renuevan cada día para que las fechas queden al día

// Para volver todo al principio antes de una presentación: abrir cualquier página con ?reiniciar=1
if (new URLSearchParams(location.search).get('reiniciar') === '1') {
  try {
    localStorage.removeItem(CLAVE_DATOS)
    localStorage.removeItem(CLAVE_SESION)
  } catch {
    // sin almacenamiento: no hay nada que borrar
  }
  history.replaceState(null, '', location.pathname)
}

function leerDatos() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_DATOS))
    if (guardado?.semilla === hoyIso() && guardado?.version === VERSION_DATOS) return guardado
  } catch {
    // sin almacenamiento (navegación privada): la demo sigue, pero los cambios no sobreviven a recargar la página
  }
  return null
}

const db = leerDatos() ?? crearDatos()

function guardar() {
  try {
    localStorage.setItem(CLAVE_DATOS, JSON.stringify(db))
  } catch {
    // ver arriba
  }
}
guardar()

function cuentaActual() {
  try {
    const id = Number(localStorage.getItem(CLAVE_SESION))
    return db.cuentas.find((cuenta) => cuenta.id === id) ?? null
  } catch {
    return null
  }
}

function abrirSesion(cuenta) {
  try {
    localStorage.setItem(CLAVE_SESION, String(cuenta.id))
  } catch {
    // ver arriba
  }
}

function cerrarSesion() {
  try {
    localStorage.removeItem(CLAVE_SESION)
  } catch {
    // ver arriba
  }
}

// Utilidades

const fallo = (status, mensaje) => new ErrorApi(status, mensaje)

function exigir(condicion, status, mensaje) {
  if (!condicion) throw fallo(status, mensaje)
}

const siguienteId = (clave) => {
  db.seq[clave] = (db.seq[clave] ?? 0) + 1
  return db.seq[clave]
}

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const porNombre = (a, b) => a.nombre.localeCompare(b.nombre, 'es')
const hora = (texto) => (texto.length === 5 ? `${texto}:00` : texto)

function edadDe(fechaNacimiento) {
  const nacimiento = desdeIso(fechaNacimiento)
  const ahora = new Date()
  let anios = ahora.getFullYear() - nacimiento.getFullYear()
  if (ahora < new Date(ahora.getFullYear(), nacimiento.getMonth(), nacimiento.getDate())) anios -= 1
  return anios
}

const nombreDeCuenta = (cuenta) => `${cuenta.nombre} ${cuenta.apellido}`

/** Cómo se presenta quien hace un cambio: los profesionales, con su título. */
function quienActua() {
  const cuenta = cuentaActual()
  exigir(cuenta, 401, 'Tu sesión venció. Ingresá de nuevo.')
  return db.profesionales.find((p) => p.usuarioId === cuenta.id)?.nombreCompleto ?? nombreDeCuenta(cuenta)
}

function buscarPorId(lista, id, descripcion) {
  const encontrado = lista.find((elemento) => elemento.id === Number(id))
  exigir(encontrado, 404, `No se encontró ${descripcion}.`)
  return encontrado
}

// Cómo se muestra cada cosa (forma de las respuestas de la API)

const nombreObraSocial = (id) => db.obrasSociales.find((os) => os.id === id)?.nombre ?? null

function vistaPaciente(paciente) {
  const edad = edadDe(paciente.fechaNacimiento)
  return { ...paciente, obraSocial: nombreObraSocial(paciente.obraSocialId), edad, menor: edad < 18 }
}

function vistaProfesional(profesional) {
  return { ...profesional, especialidad: db.especialidades.find((e) => e.id === profesional.especialidadId)?.nombre ?? '' }
}

function vistaTurno(turno) {
  const agenda = db.agendas.find((a) => a.id === turno.agendaId)
  const practica = agenda.practicas.find((p) => p.id === turno.practicaId)
  const paciente = turno.pacienteId ? db.pacientes.find((p) => p.id === turno.pacienteId) : null
  return {
    id: turno.id,
    agendaId: agenda.id,
    agenda: agenda.nombre,
    practicaId: practica.id,
    practica: practica.nombre,
    pacienteId: turno.pacienteId,
    paciente: paciente && {
      id: paciente.id, apellido: paciente.apellido, nombre: paciente.nombre, tipoDocumento: paciente.tipoDocumento,
      numeroDocumento: paciente.numeroDocumento, telefono: paciente.telefono,
    },
    inicio: turno.inicio,
    fin: turno.fin,
    estado: turno.estado,
    modalidad: turno.modalidad,
    primeraVez: turno.primeraVez,
    motivo: turno.motivo,
    obraSocialId: turno.obraSocialId,
    obraSocial: nombreObraSocial(turno.obraSocialId),
    sobreturno: turno.sobreturno,
  }
}

function vistaInforme(informe) {
  const turno = informe.turnoId ? db.turnos.find((t) => t.id === informe.turnoId) : null
  const agenda = turno ? db.agendas.find((a) => a.id === turno.agendaId) : null
  const practica = agenda?.practicas.find((p) => p.id === turno.practicaId)
  return {
    id: informe.id,
    titulo: informe.titulo,
    fechaEstudio: informe.fechaEstudio,
    descripcion: informe.descripcion,
    cargadoPor: informe.cargadoPor,
    cargadoEn: informe.cargadoEn,
    tamanioBytes: informe.tamanioBytes,
    turnoInicio: turno?.inicio ?? null,
    turnoPractica: practica?.nombre ?? null,
    turnoAgenda: agenda?.nombre ?? null,
    anulado: informe.anulado,
    anuladoPor: informe.anuladoPor,
    anuladoEn: informe.anuladoEn,
    motivoAnulacion: informe.motivoAnulacion,
    puedeAnular: !informe.anulado,
  }
}

function vistaCuenta(cuenta) {
  return {
    id: cuenta.id, dni: cuenta.dni, nombre: cuenta.nombre, apellido: cuenta.apellido, roles: cuenta.roles,
    activa: cuenta.activa, bloqueada: cuenta.bloqueada, debeCambiarPassword: cuenta.debeCambiarPassword,
  }
}

function vistaAgendaCompleta(agenda) {
  const hoy = hoyIso()
  return {
    id: agenda.id, tipo: agenda.tipo, profesionalId: agenda.profesionalId, nombre: agenda.nombre,
    pasoMinutos: agenda.pasoMinutos, activa: agenda.activa,
    reglas: agenda.reglas,
    excepciones: agenda.excepciones.filter((e) => e.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)),
    practicas: agenda.practicas,
  }
}

// Autenticación

const auth = {
  login({ dni, password }) {
    const cuenta = db.cuentas.find((c) => c.dni === dni && c.activa)
    exigir(cuenta && cuenta.password === password, 401, 'El documento o la contraseña no son correctos.')
    exigir(!cuenta.bloqueada, 403, 'La cuenta está bloqueada. Pedile a administración que la desbloquee.')
    abrirSesion(cuenta)
    return { tipo: cuenta.debeCambiarPassword ? 'RESTRINGIDO' : 'COMPLETO', expiraEn: `${hoyIso()}T23:59:00` }
  },

  yo() {
    const cuenta = cuentaActual()
    exigir(cuenta, 401, 'Tu sesión venció. Ingresá de nuevo.')
    exigir(!cuenta.debeCambiarPassword, 403, 'Tenés que cambiar tu contraseña para continuar.')
    return { id: cuenta.id, tipoToken: 'COMPLETO', roles: cuenta.roles, nombre: cuenta.nombre }
  },

  logout() {
    cerrarSesion()
  },

  cambiarPassword({ passwordActual, passwordNueva }) {
    const cuenta = cuentaActual()
    exigir(cuenta, 401, 'Tu sesión venció. Ingresá de nuevo.')
    exigir(cuenta.password === passwordActual, 400, 'La contraseña actual no es correcta.')
    exigir(passwordNueva.length >= 8, 400, 'La contraseña nueva debe tener al menos 8 caracteres.')
    cuenta.password = passwordNueva
    cuenta.debeCambiarPassword = false
  },
}

// Catálogos

function catalogo(lista, descripcion, clave) {
  return {
    listar: () => [...lista].sort(porNombre),
    crear({ nombre }) {
      const limpio = nombre?.trim()
      exigir(limpio, 400, 'Escribí el nombre.')
      exigir(!lista.some((e) => sinTildes(e.nombre) === sinTildes(limpio)), 409, `Ya existe ${descripcion} con ese nombre.`)
      const nuevo = { id: siguienteId(clave), nombre: limpio, activa: true }
      lista.push(nuevo)
      return nuevo
    },
    actualizar(id, { nombre, activa }) {
      const elemento = buscarPorId(lista, id, descripcion)
      const limpio = nombre?.trim()
      exigir(limpio, 400, 'Escribí el nombre.')
      exigir(!lista.some((e) => e.id !== elemento.id && sinTildes(e.nombre) === sinTildes(limpio)), 409, `Ya existe ${descripcion} con ese nombre.`)
      Object.assign(elemento, { nombre: limpio, activa: Boolean(activa) })
      return elemento
    },
  }
}

const obrasSociales = catalogo(db.obrasSociales, 'una obra social', 'obraSocial')
const especialidades = catalogo(db.especialidades, 'una especialidad', 'especialidad')

// Personas

function crearCuentaConClaveInicial(datos, roles) {
  const existente = db.cuentas.find((c) => c.dni === datos.dni)
  if (existente) {
    for (const rol of roles) if (!existente.roles.includes(rol)) existente.roles.push(rol)
    return existente
  }
  const nueva = {
    id: siguienteId('cuenta'), dni: datos.dni, nombre: datos.nombre, apellido: datos.apellido, roles, activa: true,
    bloqueada: false, debeCambiarPassword: true, password: datos.dni,
  }
  db.cuentas.push(nueva)
  return nueva
}

const profesionales = {
  listar: () => [...db.profesionales].sort((a, b) => a.apellido.localeCompare(b.apellido, 'es')).map(vistaProfesional),
  crear(datos) {
    exigir(!db.profesionales.some((p) => p.dni === datos.dni), 409, 'Ya existe un profesional con ese DNI.')
    buscarPorId(db.especialidades, datos.especialidadId, 'la especialidad')
    const cuenta = crearCuentaConClaveInicial(datos, ['PROFESIONAL'])
    const nuevo = {
      id: siguienteId('profesional'), usuarioId: cuenta.id, dni: datos.dni, nombre: datos.nombre, apellido: datos.apellido,
      titulo: datos.titulo, nombreCompleto: '', especialidadId: datos.especialidadId,
      matriculaTipo: datos.matriculaTipo, matriculaNumero: datos.matriculaNumero, activo: true,
    }
    nuevo.nombreCompleto = nombreCompletoProfesional(nuevo)
    db.profesionales.push(nuevo)
    return vistaProfesional(nuevo)
  },
  actualizar(id, datos) {
    const profesional = buscarPorId(db.profesionales, id, 'el profesional')
    buscarPorId(db.especialidades, datos.especialidadId, 'la especialidad')
    Object.assign(profesional, {
      titulo: datos.titulo, nombre: datos.nombre, apellido: datos.apellido, especialidadId: datos.especialidadId,
      matriculaTipo: datos.matriculaTipo, matriculaNumero: datos.matriculaNumero,
    })
    profesional.nombreCompleto = nombreCompletoProfesional(profesional)
    for (const agenda of db.agendas.filter((a) => a.profesionalId === profesional.id)) agenda.nombre = profesional.nombreCompleto
    return vistaProfesional(profesional)
  },
}

function nombreCompletoProfesional(profesional) {
  const prefijo = { DR: 'Dr.', DRA: 'Dra.', LIC: 'Lic.' }[profesional.titulo] ?? ''
  return `${prefijo} ${profesional.nombre} ${profesional.apellido}`.trim()
}

function datosDePaciente(datos) {
  return {
    nombre: datos.nombre, apellido: datos.apellido, fechaNacimiento: datos.fechaNacimiento, sexo: datos.sexo,
    telefono: datos.telefono, localidad: datos.localidad, provincia: datos.provincia, domicilio: datos.domicilio,
    obraSocialId: datos.obraSocialId, numeroAfiliado: datos.obraSocialId ? datos.numeroAfiliado : null,
    responsable: datos.responsable,
  }
}

const pacientes = {
  buscar(texto = '') {
    const buscado = sinTildes(texto.trim())
    const encontrados = db.pacientes.filter((p) => !buscado
      || p.numeroDocumento.startsWith(buscado.replace(/\./g, ''))
      || sinTildes(`${p.apellido} ${p.nombre}`).includes(buscado)
      || sinTildes(`${p.nombre} ${p.apellido}`).includes(buscado))
    return encontrados
      .sort((a, b) => a.apellido.localeCompare(b.apellido, 'es') || a.nombre.localeCompare(b.nombre, 'es'))
      .slice(0, 50)
      .map(vistaPaciente)
  },
  obtener: (id) => vistaPaciente(buscarPorId(db.pacientes, id, 'el paciente')),
  crear(datos) {
    exigir(!db.pacientes.some((p) => p.tipoDocumento === datos.tipoDocumento && p.numeroDocumento === datos.numeroDocumento),
      409, 'Ya existe un paciente con ese documento.')
    const nuevo = {
      id: siguienteId('paciente'), tipoDocumento: datos.tipoDocumento, numeroDocumento: datos.numeroDocumento,
      ...datosDePaciente(datos),
    }
    db.pacientes.push(nuevo)
    const cuenta = crearCuentaConClaveInicial({ dni: datos.numeroDocumento, nombre: datos.nombre, apellido: datos.apellido }, ['PACIENTE'])
    cuenta.pacienteId = nuevo.id
    return vistaPaciente(nuevo)
  },
  actualizar(id, datos) {
    const paciente = buscarPorId(db.pacientes, id, 'el paciente')
    Object.assign(paciente, datosDePaciente(datos))
    return vistaPaciente(paciente)
  },
}

// Agendas

const agendas = {
  listar: () => db.agendas.map(({ id, tipo, profesionalId, nombre, pasoMinutos, activa }) => ({ id, tipo, profesionalId, nombre, pasoMinutos, activa })),
  obtener: (id) => vistaAgendaCompleta(buscarPorId(db.agendas, id, 'la agenda')),
  crear({ tipo, profesionalId, nombre, pasoMinutos }) {
    if (tipo === 'LABORATORIO') {
      exigir(!db.agendas.some((a) => a.tipo === 'LABORATORIO'), 409, 'Ya existe la agenda del laboratorio.')
    } else {
      const profesional = buscarPorId(db.profesionales, profesionalId, 'el profesional')
      exigir(!db.agendas.some((a) => a.profesionalId === profesional.id), 409, 'Ese profesional ya tiene una agenda.')
      nombre ||= profesional.nombreCompleto
    }
    const nueva = {
      id: siguienteId('agenda'), tipo, profesionalId: tipo === 'LABORATORIO' ? null : profesionalId,
      nombre: nombre || 'Laboratorio', pasoMinutos, activa: true, reglas: [], excepciones: [], practicas: [],
    }
    db.agendas.push(nueva)
    return vistaAgendaCompleta(nueva)
  },
  actualizar(id, { nombre, pasoMinutos, activa }) {
    const agenda = buscarPorId(db.agendas, id, 'la agenda')
    Object.assign(agenda, { nombre, pasoMinutos, activa })
    return vistaAgendaCompleta(agenda)
  },
  horario(id, fecha) {
    return franjasDelDia(buscarPorId(db.agendas, id, 'la agenda'), fecha)
  },
  regla(agenda, datos, existente) {
    exigir(datos.horaInicio < datos.horaFin, 400, 'La hora de inicio tiene que ser anterior a la de fin.')
    exigir(datos.cadaSemanas === 1 || datos.fechaReferencia, 400, 'Indicá un día en que atiende, para saber qué semanas corresponden.')
    const regla = existente ?? { id: siguienteId('regla') }
    Object.assign(regla, {
      diaSemana: datos.diaSemana, horaInicio: hora(datos.horaInicio), horaFin: hora(datos.horaFin), cadaSemanas: datos.cadaSemanas,
      fechaReferencia: datos.fechaReferencia, vigenteDesde: datos.vigenteDesde, vigenteHasta: datos.vigenteHasta,
    })
    if (!existente) agenda.reglas.push(regla)
    return regla
  },
  excepcion(agenda, datos) {
    exigir(datos.fecha >= hoyIso(), 400, 'La fecha no puede ser anterior a hoy.')
    const nueva = {
      id: siguienteId('excepcion'), fecha: datos.fecha, horaInicio: hora(datos.horaInicio), horaFin: hora(datos.horaFin),
      tipo: datos.tipo, motivo: datos.motivo,
    }
    agenda.excepciones.push(nueva)
    return nueva
  },
  practica(agenda, datos, existente) {
    exigir(datos.nombre?.trim(), 400, 'Escribí el nombre.')
    exigir(!agenda.practicas.some((p) => p.id !== existente?.id && sinTildes(p.nombre) === sinTildes(datos.nombre.trim())),
      409, 'La agenda ya tiene una consulta o práctica con ese nombre.')
    const practica = existente ?? { id: siguienteId('practica') }
    Object.assign(practica, {
      tipo: datos.tipo, nombre: datos.nombre.trim(), duracionMinutos: datos.duracionMinutos, activa: datos.activa,
      obrasSociales: datos.obrasSociales,
    })
    if (!existente) agenda.practicas.push(practica)
    return practica
  },
}

// Turnos

const ahoraEnMinutos = () => {
  const ahora = new Date()
  return ahora.getHours() * 60 + ahora.getMinutes()
}

const turnos = {
  dia(agendaId, fecha) {
    const agenda = buscarPorId(db.agendas, agendaId, 'la agenda')
    exigir(fecha, 400, 'Indicá la fecha.')
    return {
      fecha,
      pasoMinutos: agenda.pasoMinutos,
      franjas: franjasDelDia(agenda, fecha),
      turnos: db.turnos
        .filter((t) => t.agendaId === agenda.id && t.inicio.slice(0, 10) === fecha)
        .sort((a, b) => a.inicio.localeCompare(b.inicio))
        .map(vistaTurno),
    }
  },

  /** El día de la agenda del profesional que tiene la sesión abierta. */
  miAgenda(fecha) {
    const cuenta = cuentaActual()
    exigir(cuenta, 401, 'Tu sesión venció. Ingresá de nuevo.')
    exigir(cuenta.roles.includes('PROFESIONAL'), 403, 'No tenés permiso para hacer esto.')
    const profesional = db.profesionales.find((p) => p.usuarioId === cuenta.id)
    const agenda = profesional && db.agendas.find((a) => a.profesionalId === profesional.id)
    exigir(agenda, 404, 'Todavía no tenés una agenda asignada. Consultá con la secretaría.')
    return { agenda: { id: agenda.id, nombre: agenda.nombre, pasoMinutos: agenda.pasoMinutos }, ...turnos.dia(agenda.id, fecha) }
  },

  disponibilidad(agendaId, practicaId, fecha) {
    const agenda = buscarPorId(db.agendas, agendaId, 'la agenda')
    const practica = buscarPorId(agenda.practicas, practicaId, 'la práctica')
    const hoy = hoyIso()
    const horarios = []
    for (const franja of franjasDelDia(agenda, fecha)) {
      for (let t = aMinutos(franja.inicio); t + practica.duracionMinutos <= aMinutos(franja.fin); t += agenda.pasoMinutos) {
        if (fecha < hoy || (fecha === hoy && t <= ahoraEnMinutos())) continue
        horarios.push({ hora: aHora(t), libre: tramoLibre(db, agenda.id, fecha, t, practica.duracionMinutos) })
      }
    }
    return horarios
  },

  delPaciente(pacienteId) {
    buscarPorId(db.pacientes, pacienteId, 'el paciente')
    return db.turnos
      .filter((t) => t.pacienteId === Number(pacienteId))
      .sort((a, b) => b.inicio.localeCompare(a.inicio))
      .map(vistaTurno)
  },

  /** Valida horario y cobertura y crea el turno confirmado. Lo usan "dar turno" y "reprogramar". */
  dar({ agendaId, practicaId, pacienteId, inicio, modalidad, primeraVez, motivo, obraSocialId, sobreturno }) {
    const agenda = buscarPorId(db.agendas, agendaId, 'la agenda')
    exigir(agenda.activa, 409, 'La agenda está desactivada: no se dan turnos nuevos.')
    const practica = buscarPorId(agenda.practicas, practicaId, 'la práctica')
    exigir(practica.activa, 409, 'Esa consulta o práctica está desactivada.')
    const paciente = buscarPorId(db.pacientes, pacienteId, 'el paciente')
    exigir(!obraSocialId || practica.obrasSociales.includes(obraSocialId), 400, 'La obra social elegida no cubre esta práctica.')

    const fecha = inicio.slice(0, 10)
    const minuto = aMinutos(inicio.slice(11, 16))
    exigir(inicio.slice(0, 16) > ahoraIso().slice(0, 16), 400, 'No se pueden dar turnos en el pasado.')
    const entra = franjasDelDia(agenda, fecha).some((f) => minuto >= aMinutos(f.inicio)
      && minuto + practica.duracionMinutos <= aMinutos(f.fin)
      && (minuto - aMinutos(f.inicio)) % agenda.pasoMinutos === 0)
    exigir(entra, 400, 'Ese horario no está dentro de la atención de la agenda.')
    exigir(sobreturno || tramoLibre(db, agenda.id, fecha, minuto, practica.duracionMinutos), 409,
      'Ese horario ya está ocupado. Para darlo igual, marcá Sobreturno.')

    const turno = {
      id: siguienteId('turno'), agendaId: agenda.id, practicaId: practica.id, pacienteId: paciente.id,
      inicio: `${fecha}T${aHora(minuto)}`, fin: `${fecha}T${aHora(minuto + practica.duracionMinutos)}`,
      estado: 'CONFIRMADO', modalidad: modalidad ?? 'PRESENCIAL', primeraVez: Boolean(primeraVez), motivo: motivo ?? null,
      obraSocialId: obraSocialId ?? null, sobreturno: Boolean(sobreturno),
    }
    db.turnos.push(turno)
    db.historiales[turno.id] = [{ estadoAnterior: null, estadoNuevo: 'CONFIRMADO', fechaHora: ahoraIso(), usuario: quienActua(), motivo: null }]
    return turno
  },

  cambiarEstado(id, estadoNuevo, motivo = null) {
    const turno = buscarPorId(db.turnos, id, 'el turno')
    db.historiales[turno.id].push({ estadoAnterior: turno.estado, estadoNuevo, fechaHora: ahoraIso(), usuario: quienActua(), motivo })
    turno.estado = estadoNuevo
    return turno
  },

  cancelar(id, { motivo }) {
    const turno = buscarPorId(db.turnos, id, 'el turno')
    exigir(['PENDIENTE_CONFIRMACION', 'CONFIRMADO'].includes(turno.estado), 409, 'Solo se pueden cancelar turnos pendientes o confirmados.')
    exigir(motivo?.trim(), 400, 'Indicá el motivo de la cancelación.')
    return vistaTurno(turnos.cambiarEstado(id, 'CANCELADO', motivo.trim()))
  },

  marcar(id, estado) {
    const turno = buscarPorId(db.turnos, id, 'el turno')
    exigir(turno.estado === 'CONFIRMADO', 409, 'Solo se pueden marcar turnos confirmados.')
    exigir(turno.inicio.slice(0, 10) <= hoyIso(), 409, 'Un turno futuro todavía no se puede marcar como atendido o ausente.')
    return vistaTurno(turnos.cambiarEstado(id, estado))
  },

  reprogramar(id, { inicio, sobreturno }) {
    const viejo = buscarPorId(db.turnos, id, 'el turno')
    exigir(['PENDIENTE_CONFIRMACION', 'CONFIRMADO'].includes(viejo.estado), 409, 'Solo se pueden reprogramar turnos pendientes o confirmados.')
    exigir(viejo.pacienteId, 409, 'Primero hay que asignar el paciente a la solicitud.')
    // El horario del propio turno cuenta como libre: se cancela primero y se vuelve atrás si el nuevo no es válido
    const estadoAnterior = viejo.estado
    viejo.estado = 'CANCELADO'
    try {
      const nuevo = turnos.dar({
        agendaId: viejo.agendaId, practicaId: viejo.practicaId, pacienteId: viejo.pacienteId, inicio, modalidad: viejo.modalidad,
        primeraVez: viejo.primeraVez, motivo: viejo.motivo, obraSocialId: viejo.obraSocialId, sobreturno,
      })
      viejo.estado = estadoAnterior
      turnos.cambiarEstado(viejo.id, 'CANCELADO', 'Reprogramado')
      return vistaTurno(nuevo)
    } catch (error) {
      viejo.estado = estadoAnterior
      throw error
    }
  },

  historial(id) {
    buscarPorId(db.turnos, id, 'el turno')
    return db.historiales[id] ?? []
  },
}

// Informes

const informes = {
  delPaciente(pacienteId) {
    buscarPorId(db.pacientes, pacienteId, 'el paciente')
    return db.informes
      .filter((i) => i.pacienteId === Number(pacienteId))
      .sort((a, b) => b.fechaEstudio.localeCompare(a.fechaEstudio) || b.id - a.id)
      .map(vistaInforme)
  },

  cargar(formulario) {
    exigir(formulario instanceof FormData, 400, 'Faltan los datos del informe.')
    const paciente = buscarPorId(db.pacientes, formulario.get('pacienteId'), 'el paciente')
    const archivo = formulario.get('archivo')
    exigir(archivo instanceof File && archivo.size > 0, 400, 'Elegí el archivo PDF del informe.')
    const turnoId = formulario.get('turnoId')
    if (turnoId) exigir(buscarPorId(db.turnos, turnoId, 'el turno').pacienteId === paciente.id, 400, 'El turno no es de ese paciente.')
    const nuevo = {
      id: siguienteId('informe'), pacienteId: paciente.id, turnoId: turnoId ? Number(turnoId) : null,
      titulo: formulario.get('titulo'), fechaEstudio: formulario.get('fechaEstudio'),
      descripcion: formulario.get('descripcion') || null, cargadoPor: quienActua(), cargadoEn: hoyIso(),
      tamanioBytes: archivo.size, anulado: false, anuladoPor: null, anuladoEn: null, motivoAnulacion: null,
    }
    db.informes.push(nuevo)
    return vistaInforme(nuevo)
  },

  anular(id, { motivo }) {
    const informe = buscarPorId(db.informes, id, 'el informe')
    exigir(!informe.anulado, 409, 'El informe ya está anulado.')
    exigir(motivo?.trim(), 400, 'Indicá el motivo de la anulación.')
    Object.assign(informe, { anulado: true, anuladoPor: quienActua(), anuladoEn: hoyIso(), motivoAnulacion: motivo.trim() })
    return vistaInforme(informe)
  },

  mios() {
    const cuenta = cuentaActual()
    exigir(cuenta, 401, 'Tu sesión venció. Ingresá de nuevo.')
    return db.informes
      .filter((i) => i.pacienteId === cuenta.pacienteId && !i.anulado)
      .sort((a, b) => b.fechaEstudio.localeCompare(a.fechaEstudio))
      .map(vistaInforme)
  },
}

// Cuentas del personal (ADMIN)

const personal = {
  listar: () => db.cuentas.filter((c) => c.roles.some((rol) => ROLES_PERSONAL.includes(rol))).map(vistaCuenta),
  crear({ dni, nombre, apellido, roles }) {
    exigir(!db.cuentas.some((c) => c.dni === dni), 409, 'Ya existe una cuenta con ese documento.')
    exigir(roles?.length, 400, 'Elegí al menos un rol.')
    return vistaCuenta(crearCuentaConClaveInicial({ dni, nombre, apellido }, roles))
  },
  resetearClave(id) {
    const cuenta = buscarPorId(db.cuentas, id, 'la cuenta')
    Object.assign(cuenta, { password: cuenta.dni, debeCambiarPassword: true, bloqueada: false })
  },
  desbloquear(id) {
    buscarPorId(db.cuentas, id, 'la cuenta').bloqueada = false
  },
}

// Rutas: método, patrón de la ruta y qué hacer con ella (m = grupos del patrón, q = parámetros de la URL)

const RUTAS = [
  ['POST', /^\/api\/auth\/login$/, ({ cuerpo }) => auth.login(cuerpo)],
  ['GET', /^\/api\/auth\/yo$/, () => auth.yo()],
  ['POST', /^\/api\/auth\/logout$/, () => auth.logout()],
  ['POST', /^\/api\/auth\/cambiar-password$/, ({ cuerpo }) => auth.cambiarPassword(cuerpo)],

  ['GET', /^\/api\/obras-sociales$/, () => obrasSociales.listar()],
  ['POST', /^\/api\/obras-sociales$/, ({ cuerpo }) => obrasSociales.crear(cuerpo)],
  ['PUT', /^\/api\/obras-sociales\/(\d+)$/, ({ m, cuerpo }) => obrasSociales.actualizar(m[1], cuerpo)],
  ['GET', /^\/api\/especialidades$/, () => especialidades.listar()],
  ['POST', /^\/api\/especialidades$/, ({ cuerpo }) => especialidades.crear(cuerpo)],
  ['PUT', /^\/api\/especialidades\/(\d+)$/, ({ m, cuerpo }) => especialidades.actualizar(m[1], cuerpo)],

  ['GET', /^\/api\/profesionales$/, () => profesionales.listar()],
  ['POST', /^\/api\/profesionales$/, ({ cuerpo }) => profesionales.crear(cuerpo)],
  ['PUT', /^\/api\/profesionales\/(\d+)$/, ({ m, cuerpo }) => profesionales.actualizar(m[1], cuerpo)],
  ['GET', /^\/api\/pacientes$/, ({ q }) => pacientes.buscar(q.get('buscar') ?? '')],
  ['GET', /^\/api\/pacientes\/(\d+)$/, ({ m }) => pacientes.obtener(m[1])],
  ['POST', /^\/api\/pacientes$/, ({ cuerpo }) => pacientes.crear(cuerpo)],
  ['PUT', /^\/api\/pacientes\/(\d+)$/, ({ m, cuerpo }) => pacientes.actualizar(m[1], cuerpo)],

  ['GET', /^\/api\/agendas$/, () => agendas.listar()],
  ['POST', /^\/api\/agendas$/, ({ cuerpo }) => agendas.crear(cuerpo)],
  ['GET', /^\/api\/agendas\/(\d+)$/, ({ m }) => agendas.obtener(m[1])],
  ['PUT', /^\/api\/agendas\/(\d+)$/, ({ m, cuerpo }) => agendas.actualizar(m[1], cuerpo)],
  ['GET', /^\/api\/agendas\/(\d+)\/horario$/, ({ m, q }) => agendas.horario(m[1], q.get('fecha'))],
  ['POST', /^\/api\/agendas\/(\d+)\/reglas$/, ({ m, cuerpo }) => agendas.regla(buscarPorId(db.agendas, m[1], 'la agenda'), cuerpo)],
  ['PUT', /^\/api\/agendas\/(\d+)\/reglas\/(\d+)$/, ({ m, cuerpo }) => {
    const agenda = buscarPorId(db.agendas, m[1], 'la agenda')
    return agendas.regla(agenda, cuerpo, buscarPorId(agenda.reglas, m[2], 'la franja'))
  }],
  ['DELETE', /^\/api\/agendas\/(\d+)\/reglas\/(\d+)$/, ({ m }) => {
    const agenda = buscarPorId(db.agendas, m[1], 'la agenda')
    agenda.reglas = agenda.reglas.filter((r) => r.id !== buscarPorId(agenda.reglas, m[2], 'la franja').id)
  }],
  ['POST', /^\/api\/agendas\/(\d+)\/excepciones$/, ({ m, cuerpo }) => agendas.excepcion(buscarPorId(db.agendas, m[1], 'la agenda'), cuerpo)],
  ['DELETE', /^\/api\/agendas\/(\d+)\/excepciones\/(\d+)$/, ({ m }) => {
    const agenda = buscarPorId(db.agendas, m[1], 'la agenda')
    agenda.excepciones = agenda.excepciones.filter((e) => e.id !== buscarPorId(agenda.excepciones, m[2], 'la excepción').id)
  }],
  ['POST', /^\/api\/agendas\/(\d+)\/practicas$/, ({ m, cuerpo }) => agendas.practica(buscarPorId(db.agendas, m[1], 'la agenda'), cuerpo)],
  ['PUT', /^\/api\/agendas\/(\d+)\/practicas\/(\d+)$/, ({ m, cuerpo }) => {
    const agenda = buscarPorId(db.agendas, m[1], 'la agenda')
    return agendas.practica(agenda, cuerpo, buscarPorId(agenda.practicas, m[2], 'la práctica'))
  }],

  ['GET', /^\/api\/mi-agenda\/dia$/, ({ q }) => turnos.miAgenda(q.get('fecha'))],
  ['GET', /^\/api\/turnos\/dia$/, ({ q }) => turnos.dia(q.get('agendaId'), q.get('fecha'))],
  ['GET', /^\/api\/turnos\/disponibilidad$/, ({ q }) => turnos.disponibilidad(q.get('agendaId'), q.get('practicaId'), q.get('fecha'))],
  ['GET', /^\/api\/turnos$/, ({ q }) => turnos.delPaciente(q.get('pacienteId'))],
  ['POST', /^\/api\/turnos$/, ({ cuerpo }) => vistaTurno(turnos.dar(cuerpo))],
  ['POST', /^\/api\/turnos\/(\d+)\/cancelar$/, ({ m, cuerpo }) => turnos.cancelar(m[1], cuerpo)],
  ['POST', /^\/api\/turnos\/(\d+)\/atendido$/, ({ m }) => turnos.marcar(m[1], 'ATENDIDO')],
  ['POST', /^\/api\/turnos\/(\d+)\/ausente$/, ({ m }) => turnos.marcar(m[1], 'AUSENTE')],
  ['POST', /^\/api\/turnos\/(\d+)\/reprogramar$/, ({ m, cuerpo }) => turnos.reprogramar(m[1], cuerpo)],
  ['GET', /^\/api\/turnos\/(\d+)\/historial$/, ({ m }) => turnos.historial(m[1])],

  ['GET', /^\/api\/informes$/, ({ q }) => informes.delPaciente(q.get('pacienteId'))],
  ['POST', /^\/api\/informes$/, ({ cuerpo }) => informes.cargar(cuerpo)],
  ['POST', /^\/api\/informes\/(\d+)\/anular$/, ({ m, cuerpo }) => informes.anular(m[1], cuerpo)],
  ['GET', /^\/api\/mis-informes$/, () => informes.mios()],

  ['GET', /^\/api\/admin\/usuarios$/, () => personal.listar()],
  ['POST', /^\/api\/admin\/usuarios$/, ({ cuerpo }) => personal.crear(cuerpo)],
  ['POST', /^\/api\/admin\/usuarios\/(\d+)\/resetear-clave$/, ({ m }) => personal.resetearClave(m[1])],
  ['POST', /^\/api\/admin\/usuarios\/(\d+)\/desbloquear$/, ({ m }) => personal.desbloquear(m[1])],
]

// yo responde por sí mismo 401 o 403 según el estado de la sesión; cambiar-password valida la sesión adentro
const RUTAS_SIN_SESION = [/^\/api\/auth\//]

/** Punto de entrada: lo llama pedir() de api.js en lugar de hacer el fetch. */
export async function atender(metodo, ruta, cuerpo) {
  // Una pausa corta, para que se vea como una conexión real y no todo instantáneo
  await new Promise((resolver) => setTimeout(resolver, 90))
  const url = new URL(ruta, 'https://demo.local')
  const entrada = RUTAS.find(([metodoRuta, patron]) => metodoRuta === metodo && patron.test(url.pathname))
  exigir(entrada, 404, 'No se encontró lo que buscabas.')
  if (!RUTAS_SIN_SESION.some((patron) => patron.test(url.pathname))) {
    exigir(cuentaActual(), 401, 'Tu sesión venció. Ingresá de nuevo.')
  }
  const resultado = entrada[2]({ m: url.pathname.match(entrada[1]), q: url.searchParams, cuerpo })
  guardar()
  // La respuesta se copia, como si hubiera viajado por la red: la pantalla no comparte objetos con la "base"
  return resultado === undefined ? undefined : JSON.parse(JSON.stringify(resultado))
}

// Este sitio no es para buscadores
if (!document.querySelector('meta[name="robots"]')) {
  const meta = document.createElement('meta')
  meta.name = 'robots'
  meta.content = 'noindex'
  document.head.append(meta)
}
