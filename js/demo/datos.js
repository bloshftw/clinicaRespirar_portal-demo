// Datos ficticios de la demo y la lógica de horarios. Todo es inventado: ninguna persona ni documento es real.
// Las fechas son relativas a hoy, así la agenda siempre se ve con turnos pasados, de hoy y próximos.

export const CLAVE_INICIAL = '1234'

/** Subir este número cada vez que cambian los datos de partida (cuentas, pacientes, agendas…): los navegadores que ya
 * tenían guardada una base anterior la descartan y arrancan con la nueva. */
export const VERSION_DATOS = 2

// Fechas y horas (mismo formato que usa la API)

const dos = (numero) => String(numero).padStart(2, '0')
const DIA_MS = 86400000

export const aIso = (fecha) => `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`
export const desdeIso = (iso) => {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}
export const hoyIso = () => aIso(new Date())
export const sumarDias = (iso, dias) => {
  const fecha = desdeIso(iso)
  fecha.setDate(fecha.getDate() + dias)
  return aIso(fecha)
}
/** 1 = lunes ... 7 = domingo. */
export const diaSemanaIso = (iso) => desdeIso(iso).getDay() || 7
export const aMinutos = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
export const aHora = (minutos) => `${dos(Math.floor(minutos / 60))}:${dos(minutos % 60)}:00`
export const ahoraIso = () => {
  const ahora = new Date()
  return `${aIso(ahora)}T${dos(ahora.getHours())}:${dos(ahora.getMinutes())}:${dos(ahora.getSeconds())}`
}
const utc = (iso) => {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(anio, mes - 1, dia)
}
const lunesDe = (iso) => sumarDias(iso, -(diaSemanaIso(iso) - 1))
const semanasEntre = (desde, hasta) => Math.round((utc(lunesDe(hasta)) - utc(lunesDe(desde))) / (7 * DIA_MS))

// Horario de una agenda

function restar(franjas, [desde, hasta]) {
  return franjas.flatMap(([inicio, fin]) => {
    if (hasta <= inicio || desde >= fin) return [[inicio, fin]]
    return [[inicio, Math.max(inicio, desde)], [Math.min(fin, hasta), fin]].filter(([a, b]) => b > a)
  })
}

function unir(franjas) {
  const ordenadas = [...franjas].sort((a, b) => a[0] - b[0])
  const unidas = []
  for (const [inicio, fin] of ordenadas) {
    const ultima = unidas[unidas.length - 1]
    if (ultima && inicio <= ultima[1]) ultima[1] = Math.max(ultima[1], fin)
    else unidas.push([inicio, fin])
  }
  return unidas
}

/** Franjas en que atiende una agenda ese día, según su horario habitual y sus excepciones: [{ inicio, fin }]. */
export function franjasDelDia(agenda, fecha) {
  const dia = diaSemanaIso(fecha)
  let franjas = agenda.reglas
    .filter((regla) => regla.diaSemana === dia
      && regla.vigenteDesde <= fecha
      && (!regla.vigenteHasta || fecha <= regla.vigenteHasta)
      && (regla.cadaSemanas === 1 || semanasEntre(regla.fechaReferencia, fecha) % regla.cadaSemanas === 0))
    .map((regla) => [aMinutos(regla.horaInicio), aMinutos(regla.horaFin)])
  const delDia = agenda.excepciones.filter((excepcion) => excepcion.fecha === fecha)
  for (const apertura of delDia.filter((excepcion) => excepcion.tipo === 'APERTURA')) {
    franjas.push([aMinutos(apertura.horaInicio), aMinutos(apertura.horaFin)])
  }
  franjas = unir(franjas)
  for (const bloqueo of delDia.filter((excepcion) => excepcion.tipo === 'BLOQUEO')) {
    franjas = restar(franjas, [aMinutos(bloqueo.horaInicio), aMinutos(bloqueo.horaFin)])
  }
  return franjas.map(([inicio, fin]) => ({ inicio: aHora(inicio), fin: aHora(fin) }))
}

/** ¿El tramo [minutoInicio, minutoInicio + duracion) está libre de turnos activos? */
export function tramoLibre(db, agendaId, fecha, minutoInicio, duracion) {
  return !db.turnos.some((turno) => turno.agendaId === agendaId
    && turno.estado !== 'CANCELADO'
    && turno.inicio.slice(0, 10) === fecha
    && aMinutos(turno.inicio.slice(11)) < minutoInicio + duracion
    && aMinutos(turno.fin.slice(11)) > minutoInicio)
}

// Datos de partida

function azarConSemilla(semilla) {
  let estado = semilla
  return () => {
    estado = (estado + 0x6d2b79f5) | 0
    let valor = Math.imul(estado ^ (estado >>> 15), 1 | estado)
    valor = (valor + Math.imul(valor ^ (valor >>> 7), 61 | valor)) ^ valor
    return ((valor ^ (valor >>> 14)) >>> 0) / 4294967296
  }
}

const OBRAS_SOCIALES = ['OSDE', 'Swiss Medical', 'PAMI', 'Galeno', 'IOSFA', 'Obra social provincial', 'Prevención Salud']
const ESPECIALIDADES = ['Neumonología', 'Medicina del sueño', 'Kinesiología respiratoria', 'Neumonología pediátrica', 'Alergia e inmunología']

// [apellido, nombre, nacimiento, sexo, localidad, obra social (1 = OSDE, 0 = particular), documento]
const PACIENTES = [
  ['Fernández', 'Lucía', '1986-04-12', 'F', 'Villa Mercedes', 1, '44444444'],
  ['Pereyra', 'Julián', '1975-09-03', 'M', 'Villa Mercedes', 3, '24100201'],
  ['Castro', 'Marta', '1951-01-22', 'F', 'Justo Daract', 3, '10200302'],
  ['Álvarez', 'Tomás', '2014-07-18', 'M', 'Villa Mercedes', 2, '52300403'],
  ['Domínguez', 'Ricardo', '1962-11-30', 'M', 'Buena Esperanza', 6, '14400504'],
  ['Molina', 'Sofía', '1993-02-14', 'F', 'Villa Mercedes', 4, '36500605'],
  ['Rojas', 'Esteban', '1948-06-09', 'M', 'Villa Mercedes', 3, '7600706'],
  ['Giménez', 'Camila', '2011-03-05', 'F', 'San Luis', 1, '49700807'],
  ['Ledesma', 'Héctor', '1957-12-01', 'M', 'Justo Daract', 6, '12800908'],
  ['Acosta', 'Valeria', '1980-08-25', 'F', 'Villa Mercedes', 2, '28901009'],
  ['Vega', 'Nicolás', '1999-10-17', 'M', 'Villa Mercedes', 0, '42001110'],
  ['Herrera', 'Elena', '1944-05-28', 'F', 'Merlo', 3, '4101211'],
  ['Medina', 'Gustavo', '1969-03-11', 'M', 'Villa Mercedes', 5, '20201312'],
  ['Ortiz', 'Paula', '1988-12-09', 'F', 'San Luis', 4, '33301413'],
  ['Luján', 'Facundo', '2005-01-20', 'M', 'Villa Mercedes', 0, '46401514'],
  ['Paz', 'Rosa', '1954-07-07', 'F', 'Villa Mercedes', 3, '11501615'],
  ['Cabrera', 'Diego', '1977-04-30', 'M', 'Buena Esperanza', 1, '25601716'],
  ['Navarro', 'Agustina', '2016-09-12', 'F', 'Villa Mercedes', 2, '55701817'],
  ['Funes', 'Raúl', '1959-10-19', 'M', 'Villa Mercedes', 3, '13801918'],
  ['Maldonado', 'Silvia', '1972-06-21', 'F', 'Justo Daract', 6, '22902019'],
  ['Aguirre', 'Martín', '1991-11-02', 'M', 'Villa Mercedes', 4, '35002120'],
  ['Bustos', 'Carmen', '1946-02-16', 'F', 'Merlo', 3, '5102221'],
  ['Videla', 'Joaquín', '1984-08-08', 'M', 'San Luis', 1, '31202322'],
  ['Peralta', 'Andrea', '1967-01-27', 'F', 'Villa Mercedes', 5, '18302423'],
]

const DESCRIPCIONES = {
  Espirometría: ['Patrón obstructivo leve, con buena respuesta al broncodilatador.', 'Valores dentro de lo esperado para edad y talla.', 'Obstrucción moderada. Se sugiere control en 3 meses.'],
  'Informe de consulta': ['Control de rutina. Continúa con el tratamiento indicado.', 'Se ajusta la medicación y se solicitan estudios complementarios.'],
  'Poligrafía respiratoria nocturna': ['Índice de apneas e hipopneas leve. Se indican medidas posturales.'],
  'Gasometría arterial': ['Valores dentro de parámetros normales.'],
}

const MOTIVOS_CANCELACION = ['Avisó por WhatsApp', 'No puede asistir ese día', 'Reprogramado por el profesional']

/** Crea toda la base de la demo: pacientes, profesionales, agendas, turnos de varias semanas e informes. */
export function crearDatos() {
  const hoy = hoyIso()
  const azar = azarConSemilla(20260)
  const db = {
    semilla: hoy,
    version: VERSION_DATOS,
    seq: {},
    cuentas: [],
    obrasSociales: [],
    especialidades: [],
    profesionales: [],
    pacientes: [],
    agendas: [],
    turnos: [],
    historiales: {},
    informes: [],
  }
  const siguiente = (clave) => {
    db.seq[clave] = (db.seq[clave] ?? 0) + 1
    return db.seq[clave]
  }
  const elegir = (lista) => lista[Math.floor(azar() * lista.length)]

  OBRAS_SOCIALES.forEach((nombre) => db.obrasSociales.push({ id: siguiente('obraSocial'), nombre, activa: nombre !== 'Prevención Salud' }))
  ESPECIALIDADES.forEach((nombre) => db.especialidades.push({ id: siguiente('especialidad'), nombre, activa: true }))

  // Personal con cuenta propia

  const cuenta = (datos) => {
    db.cuentas.push({ id: siguiente('cuenta'), activa: true, bloqueada: false, debeCambiarPassword: false, password: CLAVE_INICIAL, ...datos })
    return db.cuentas[db.cuentas.length - 1]
  }
  cuenta({ dni: '22222222', nombre: 'Marina', apellido: 'Quiroga', roles: ['SECRETARIA'] })
  cuenta({ dni: '11111111', nombre: 'Alejandro', apellido: 'Ferreyra', roles: ['ADMIN'] })
  cuenta({ dni: '55555555', nombre: 'Gabriela', apellido: 'Luna', roles: ['LABORATORIO'] })
  cuenta({ dni: '29888777', nombre: 'Romina', apellido: 'Salas', roles: ['SECRETARIA'], debeCambiarPassword: true })
  cuenta({ dni: '33999000', nombre: 'Federico', apellido: 'Mena', roles: ['LABORATORIO'], bloqueada: true })

  // Profesionales

  const profesional = (dni, titulo, nombre, apellido, especialidadId, matriculaNumero) => {
    const usuario = cuenta({ dni, nombre, apellido, roles: ['PROFESIONAL'] })
    const prefijo = { DR: 'Dr.', DRA: 'Dra.', LIC: 'Lic.' }[titulo]
    db.profesionales.push({
      id: siguiente('profesional'), usuarioId: usuario.id, dni, nombre, apellido, titulo,
      nombreCompleto: `${prefijo} ${nombre} ${apellido}`, especialidadId,
      matriculaTipo: 'MP', matriculaNumero, activo: true,
    })
  }
  profesional('33333333', 'DRA', 'Laura', 'Benítez', 1, '4521')
  profesional('22333444', 'DR', 'Martín', 'Sosa', 2, '3987')
  profesional('25444555', 'LIC', 'Carolina', 'Ríos', 3, '1204')
  profesional('23555666', 'DR', 'Pablo', 'Ibáñez', 4, '3310')

  // Pacientes (cada uno con su cuenta del portal)

  PACIENTES.forEach(([apellido, nombre, fechaNacimiento, sexo, localidad, obraSocialId, dni], indice) => {
    const paciente = {
      id: siguiente('paciente'), tipoDocumento: 'DNI', numeroDocumento: dni, nombre, apellido, fechaNacimiento, sexo,
      telefono: `+549265700${String(1100 + indice).padStart(4, '0')}`, localidad, provincia: 'San Luis',
      domicilio: null, obraSocialId: obraSocialId || null, numeroAfiliado: obraSocialId ? `${40000 + indice * 137}` : null,
      responsable: null,
    }
    if (new Date().getFullYear() - Number(fechaNacimiento.slice(0, 4)) < 18) {
      paciente.responsable = { nombre: 'Natalia', apellido, documento: `${27000000 + indice * 911}`, telefono: `+549265700${String(2100 + indice).padStart(4, '0')}`, relacion: 'MADRE' }
    }
    db.pacientes.push(paciente)
    cuenta({ dni, nombre, apellido, roles: ['PACIENTE'], pacienteId: paciente.id })
  })

  // Agendas

  const desde = sumarDias(hoy, -90)
  const agenda = (tipo, profesionalId, nombre, pasoMinutos) => {
    const nueva = { id: siguiente('agenda'), tipo, profesionalId, nombre, pasoMinutos, activa: true, reglas: [], excepciones: [], practicas: [] }
    db.agendas.push(nueva)
    return nueva
  }
  const regla = (a, diaSemana, horaInicio, horaFin, extra = {}) =>
    a.reglas.push({ id: siguiente('regla'), diaSemana, horaInicio, horaFin, cadaSemanas: 1, fechaReferencia: null, vigenteDesde: desde, vigenteHasta: null, ...extra })
  const practica = (a, tipo, nombre, duracionMinutos, obrasSociales) =>
    a.practicas.push({ id: siguiente('practica'), tipo, nombre, duracionMinutos, activa: true, obrasSociales })

  const benitez = agenda('PROFESIONAL', 1, 'Dra. Laura Benítez', 20)
  ;[1, 3, 5].forEach((dia) => regla(benitez, dia, '09:00:00', '13:00:00'))
  regla(benitez, 2, '15:00:00', '19:00:00')
  practica(benitez, 'CONSULTA', 'Consulta neumonológica', 20, [1, 2, 3, 4, 6])
  practica(benitez, 'CONSULTA', 'Control', 20, [1, 2, 3, 4, 6])
  practica(benitez, 'PRACTICA', 'Espirometría', 40, [1, 2, 3])
  // El miércoles de la semana que viene (el lunes próximo siempre cae entre mañana y dentro de 7 días)
  const proximoMiercoles = sumarDias(hoy, 8 - diaSemanaIso(hoy) + 2)
  benitez.excepciones.push({ id: siguiente('excepcion'), fecha: proximoMiercoles, horaInicio: '00:00:00', horaFin: '23:59:00', tipo: 'BLOQUEO', motivo: 'Congreso de neumonología' })

  const sosa = agenda('PROFESIONAL', 2, 'Dr. Martín Sosa', 30)
  ;[2, 4].forEach((dia) => regla(sosa, dia, '14:00:00', '18:00:00'))
  regla(sosa, 6, '09:00:00', '12:00:00', { cadaSemanas: 2, fechaReferencia: sumarDias(lunesDe(hoy), 5) })
  practica(sosa, 'CONSULTA', 'Consulta de medicina del sueño', 30, [1, 2, 6])
  practica(sosa, 'PRACTICA', 'Poligrafía respiratoria nocturna', 60, [1, 2])

  const rios = agenda('PROFESIONAL', 3, 'Lic. Carolina Ríos', 15)
  ;[1, 3, 5].forEach((dia) => regla(rios, dia, '08:00:00', '12:00:00'))
  ;[2, 4].forEach((dia) => regla(rios, dia, '16:00:00', '19:00:00'))
  practica(rios, 'CONSULTA', 'Sesión de kinesiología respiratoria', 30, [1, 3, 4, 6])
  practica(rios, 'CONSULTA', 'Evaluación inicial', 45, [1, 3, 4])

  const laboratorio = agenda('LABORATORIO', null, 'Laboratorio', 15)
  ;[1, 2, 3, 4, 5].forEach((dia) => regla(laboratorio, dia, '07:30:00', '10:00:00'))
  practica(laboratorio, 'PRACTICA', 'Extracción de sangre', 15, [1, 2, 3, 4, 6])
  practica(laboratorio, 'PRACTICA', 'Gasometría arterial', 30, [1, 2, 3])
  const diasHastaSabado = 6 - diaSemanaIso(hoy)
  const proximoSabado = sumarDias(hoy, diasHastaSabado <= 0 ? diasHastaSabado + 7 : diasHastaSabado)
  laboratorio.excepciones.push({ id: siguiente('excepcion'), fecha: proximoSabado, horaInicio: '08:00:00', horaFin: '10:00:00', tipo: 'APERTURA', motivo: 'Apertura especial por campaña' })

  // Turnos

  const profesionalDe = (a) => db.profesionales.find((p) => p.id === a.profesionalId)
  const quien = db.cuentas[0]
  const nombreCuenta = (c) => `${c.nombre} ${c.apellido}`

  function crearTurno(a, p, paciente, fecha, minuto, estado, extra = {}) {
    const turno = {
      id: siguiente('turno'), agendaId: a.id, practicaId: p.id, pacienteId: paciente?.id ?? null,
      inicio: `${fecha}T${aHora(minuto)}`, fin: `${fecha}T${aHora(minuto + p.duracionMinutos)}`,
      estado, modalidad: 'PRESENCIAL', primeraVez: false, motivo: null,
      obraSocialId: paciente?.obraSocialId && p.obrasSociales.includes(paciente.obraSocialId) ? paciente.obraSocialId : null,
      sobreturno: false, ...extra,
    }
    db.turnos.push(turno)
    const inicio = estado === 'PENDIENTE_CONFIRMACION' ? null : 'CONFIRMADO'
    const cambios = [{ estadoAnterior: null, estadoNuevo: inicio ?? estado, fechaHora: `${sumarDias(fecha, -3)}T10:15:00`, usuario: quien ? nombreCuenta(quien) : 'Sistema', motivo: null }]
    if (!['CONFIRMADO', 'PENDIENTE_CONFIRMACION'].includes(estado)) {
      const pasado = fecha <= hoy
      cambios.push({
        estadoAnterior: 'CONFIRMADO', estadoNuevo: estado, usuario: nombreCuenta(quien),
        fechaHora: pasado ? `${fecha}T${aHora(minuto + p.duracionMinutos + 5)}` : `${hoy}T08:30:00`,
        motivo: estado === 'CANCELADO' ? elegir(MOTIVOS_CANCELACION) : null,
      })
    }
    db.historiales[turno.id] = cambios
    return turno
  }

  const informe = (datos) => {
    const nuevo = {
      id: siguiente('informe'), turnoId: null, descripcion: null, tamanioBytes: 90000 + Math.floor(azar() * 300000),
      anulado: false, anuladoPor: null, anuladoEn: null, motivoAnulacion: null, ...datos,
    }
    db.informes.push(nuevo)
    return nuevo
  }

  /** Primer horario libre de la agenda ese día para una práctica, o null. */
  function primerLibre(a, p, fecha) {
    for (const franja of franjasDelDia(a, fecha)) {
      for (let t = aMinutos(franja.inicio); t + p.duracionMinutos <= aMinutos(franja.fin); t += a.pasoMinutos) {
        if (tramoLibre(db, a.id, fecha, t, p.duracionMinutos)) return t
      }
    }
    return null
  }

  /** Días (de a uno, hacia atrás o adelante desde hoy) en que la agenda atiende. */
  function diasConAtencion(a, sentido, cantidad) {
    const dias = []
    for (let i = 1; dias.length < cantidad && i < 60; i += 1) {
      const fecha = sumarDias(hoy, sentido * i)
      if (franjasDelDia(a, fecha).length) dias.push(fecha)
    }
    return dias
  }

  // La historia de Lucía Fernández (la cuenta de paciente), armada a mano para que su portal se vea completo
  const lucia = db.pacientes[0]
  const pasados = diasConAtencion(benitez, -1, 3)
  const [consulta, control, espirometria] = benitez.practicas
  const turnoConsulta = crearTurno(benitez, consulta, lucia, pasados[2], primerLibre(benitez, consulta, pasados[2]), 'ATENDIDO', { primeraVez: true, motivo: 'Tos persistente' })
  const turnoEspiro = crearTurno(benitez, espirometria, lucia, pasados[1], primerLibre(benitez, espirometria, pasados[1]), 'ATENDIDO', { motivo: 'Espirometría pedida en la primera consulta' })
  const turnoControl = crearTurno(benitez, control, lucia, pasados[0], primerLibre(benitez, control, pasados[0]), 'ATENDIDO')
  const diaRios = diasConAtencion(rios, -1, 1)[0]
  const turnoRios = crearTurno(rios, rios.practicas[0], lucia, diaRios, primerLibre(rios, rios.practicas[0], diaRios), 'ATENDIDO')
  const proximosBenitez = diasConAtencion(benitez, 1, 2)
  crearTurno(benitez, control, lucia, proximosBenitez[1], primerLibre(benitez, control, proximosBenitez[1]), 'CONFIRMADO', { motivo: 'Control con resultados' })
  const proximoRios = diasConAtencion(rios, 1, 1)[0]
  crearTurno(rios, rios.practicas[0], lucia, proximoRios, primerLibre(rios, rios.practicas[0], proximoRios), 'CONFIRMADO')

  const dra = profesionalDe(benitez).nombreCompleto
  informe({ pacienteId: lucia.id, turnoId: turnoConsulta.id, titulo: 'Informe de consulta', fechaEstudio: pasados[2], descripcion: 'Primera consulta. Se solicita espirometría y radiografía de tórax.', cargadoPor: dra, cargadoEn: pasados[2] })
  informe({ pacienteId: lucia.id, turnoId: turnoEspiro.id, titulo: 'Espirometría', fechaEstudio: pasados[1], descripcion: 'Patrón obstructivo leve, con buena respuesta al broncodilatador.', cargadoPor: dra, cargadoEn: pasados[1] })
  informe({ pacienteId: lucia.id, turnoId: turnoControl.id, titulo: 'Informe de consulta', fechaEstudio: pasados[0], descripcion: 'Evolución favorable. Continúa con el tratamiento.', cargadoPor: dra, cargadoEn: pasados[0] })
  informe({ pacienteId: lucia.id, turnoId: turnoRios.id, titulo: 'Evaluación kinesiológica', fechaEstudio: diaRios, descripcion: 'Se inicia plan de ejercicios respiratorios, dos sesiones por semana.', cargadoPor: profesionalDe(rios).nombreCompleto, cargadoEn: diaRios })
  informe({ pacienteId: lucia.id, titulo: 'Hemograma completo', fechaEstudio: sumarDias(hoy, -40), descripcion: 'Resultados sin alteraciones.', cargadoPor: 'Gabriela Luna', cargadoEn: sumarDias(hoy, -40) })

  // El resto de la agenda se llena al azar, sin pisar lo anterior

  let pendientes = 0
  for (const a of db.agendas) {
    for (let delta = -10; delta <= 14; delta += 1) {
      const fecha = sumarDias(hoy, delta)
      for (const franja of franjasDelDia(a, fecha)) {
        let minuto = aMinutos(franja.inicio)
        const fin = aMinutos(franja.fin)
        while (minuto + a.pasoMinutos <= fin) {
          const p = azar() < 0.65 ? a.practicas[0] : elegir(a.practicas)
          const probabilidad = delta === 0 ? 0.7 : 0.5
          if (minuto + p.duracionMinutos <= fin && tramoLibre(db, a.id, fecha, minuto, p.duracionMinutos) && azar() < probabilidad) {
            const sorteo = azar()
            let estado = 'CONFIRMADO'
            let paciente = db.pacientes[1 + Math.floor(azar() * (db.pacientes.length - 1))]
            if (delta < 0) estado = sorteo < 0.82 ? 'ATENDIDO' : sorteo < 0.92 ? 'AUSENTE' : 'CANCELADO'
            else if (sorteo < 0.06) estado = 'CANCELADO'
            else if (delta >= 2 && delta <= 6 && pendientes < 2 && sorteo > 0.9 && a.tipo === 'PROFESIONAL') {
              estado = 'PENDIENTE_CONFIRMACION'
              paciente = null
              pendientes += 1
            }
            const turno = crearTurno(a, p, paciente, fecha, minuto, estado, {
              primeraVez: azar() < 0.15,
              modalidad: a.id === sosa.id && p === a.practicas[0] && azar() < 0.15 ? 'VIDEOLLAMADA' : 'PRESENCIAL',
              motivo: estado === 'PENDIENTE_CONFIRMACION' ? 'Solicitud desde la web' : null,
            })
            if (estado === 'ATENDIDO' && azar() < 0.8 && DESCRIPCIONES[p.nombre]) {
              informe({
                pacienteId: paciente.id, turnoId: turno.id, titulo: p.nombre, fechaEstudio: fecha,
                descripcion: elegir(DESCRIPCIONES[p.nombre]),
                cargadoPor: a.tipo === 'LABORATORIO' ? 'Gabriela Luna' : profesionalDe(a).nombreCompleto, cargadoEn: fecha,
              })
            }
            minuto += p.duracionMinutos
          } else {
            minuto += a.pasoMinutos
          }
        }
      }
    }
  }

  // Un informe cargado por error, para mostrar cómo queda uno anulado
  const ejemplo = db.informes.find((i) => i.pacienteId !== lucia.id && i.turnoId)
  if (ejemplo) Object.assign(ejemplo, { anulado: true, anuladoPor: 'Marina Quiroga', anuladoEn: ejemplo.cargadoEn, motivoAnulacion: 'Era de otro paciente' })

  return db
}
