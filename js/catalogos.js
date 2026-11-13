// Catálogos de obras sociales y especialidades (D35, D44): alta, cambio de nombre y desactivación.
import { mensajeDeError } from './api.js'
import { marcarEnviando, mostrarError } from './formulario.js'
import { actualizarObraSocial, crearObraSocial, listarObrasSociales } from './obrasocial.js'
import { actualizarEspecialidad, crearEspecialidad, listarEspecialidades } from './persona.js'
import { mostrarMenu, rolesDe } from './secciones.js'
import { exigirSesion } from './sesion.js'
import { boton, conBoton, elemento, insignia } from './vista.js'

const CATALOGOS = {
  'obras-sociales': { listar: listarObrasSociales, crear: crearObraSocial, actualizar: actualizarObraSocial },
  especialidades: { listar: listarEspecialidades, crear: crearEspecialidad, actualizar: actualizarEspecialidad },
}

/** Conecta una sección de la página con su catálogo. Devuelve la función que carga la lista. */
function montarCatalogo(seccion, api) {
  const parte = (nombre) => seccion.querySelector(`[data-parte="${nombre}"]`)
  const campo = parte('nombre')
  const agregar = parte('agregar')
  const error = parte('error')
  const exito = parte('exito')
  const lista = parte('lista')
  const vacio = parte('vacio')

  const avisar = (mensaje) => {
    mostrarError(error, null)
    mostrarError(exito, mensaje)
  }
  const fallar = (err) => {
    mostrarError(exito, null)
    mostrarError(error, mensajeDeError(err))
  }

  async function cargar() {
    try {
      const elementos = await api.listar()
      lista.replaceChildren(...elementos.map(fila))
      vacio.hidden = elementos.length > 0
    } catch (err) {
      fallar(err)
    }
  }

  function fila(item) {
    const li = elemento('li', 'flex flex-wrap items-center gap-2 py-2.5')
    li.append(elemento('span', `min-w-0 flex-1 ${item.activa ? 'text-slate-800' : 'text-slate-400'}`, item.nombre))
    if (!item.activa) li.append(insignia('Desactivada'))
    const cambiarEstado = boton(item.activa ? 'Desactivar' : 'Activar', 'boton-secundario', () =>
      conBoton(cambiarEstado, async () => {
        await api.actualizar(item.id, item.nombre, !item.activa)
        avisar(`${item.nombre} quedó ${item.activa ? 'desactivada' : 'activa'}.`)
        await cargar()
      }, fallar))
    li.append(boton('Editar', 'boton-secundario', () => editarEnLinea(li, item)), cambiarEstado)
    return li
  }

  function editarEnLinea(li, item) {
    const formulario = elemento('form', 'flex w-full flex-wrap gap-2')
    formulario.noValidate = true
    const nombre = elemento('input', 'campo min-w-0 flex-1')
    nombre.value = item.nombre
    nombre.maxLength = 100
    nombre.setAttribute('aria-label', `Nuevo nombre para ${item.nombre}`)
    const guardar = elemento('button', 'boton', 'Guardar')
    guardar.type = 'submit'
    formulario.append(nombre, guardar, boton('Cancelar', 'boton-secundario', () => li.replaceWith(fila(item))))
    formulario.addEventListener('submit', async (evento) => {
      evento.preventDefault()
      if (!nombre.value.trim()) {
        mostrarError(error, 'Escribí el nombre.')
        return
      }
      await conBoton(guardar, async () => {
        await api.actualizar(item.id, nombre.value.trim(), item.activa)
        avisar('Se guardó el nombre.')
        await cargar()
      }, fallar)
    })
    li.replaceChildren(formulario)
    nombre.focus()
  }

  parte('formulario').addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const nombre = campo.value.trim()
    if (!nombre) {
      mostrarError(exito, null)
      mostrarError(error, 'Escribí el nombre.')
      return
    }
    marcarEnviando(agregar, true, 'Agregando…')
    try {
      const creado = await api.crear(nombre)
      campo.value = ''
      avisar(`Se agregó ${creado.nombre}.`)
      await cargar()
    } catch (err) {
      fallar(err)
    } finally {
      marcarEnviando(agregar, false)
    }
  })

  return cargar
}

const sesion = await exigirSesion('catalogos', rolesDe('catalogos'))
if (sesion) {
  mostrarMenu(sesion.usuario.roles, 'catalogos')
  const secciones = [...document.querySelectorAll('[data-catalogo]')]
  await Promise.all(secciones.map((seccion) => montarCatalogo(seccion, CATALOGOS[seccion.dataset.catalogo])()))
}
