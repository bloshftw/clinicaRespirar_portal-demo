# Clínica Respirar — Portal Demo

Demostración del portal del sistema de gestión: las **mismas pantallas y funciones** que el portal real, pero **sin backend y con datos ficticios**. Sirve para mostrarle el sistema a clientes desde cualquier dispositivo, sin instalar nada.

Es un proyecto independiente del portal real (`clinicaRespirar_portal`): no se conecta a la API ni a la base de datos, y no puede ver ni modificar datos reales.

HTML · JavaScript · Tailwind CSS 4 · CSS.

## Qué se puede probar

| Rol | Entra a |
| --- | --- |
| **Secretaría** | Turnos (dar, sobreturno, cancelar, reprogramar, atendido/ausente, historial), pacientes, agendas (horario habitual, excepciones, prácticas y cobertura), profesionales, catálogos, informes |
| **Profesional** | Mi agenda (sus turnos de cada día, solo lectura) e informes de sus pacientes (cargar y anular) |
| **Paciente** | Mis informes, para ver o descargar |
| **Laboratorio** | Carga de informes |
| **Administración** | Todo lo anterior, más las cuentas del personal (alta, reseteo de clave, desbloqueo) |

## Cuentas para ingresar

Se ingresa como en el portal real: número de documento y contraseña. Todas las cuentas usan la contraseña `1234`.

| Rol | Documento | Usuario |
| --- | --- | --- |
| Administración | `11111111` | Alejandro Ferreyra |
| Secretaría | `22222222` | Marina Quiroga |
| Profesional | `33333333` | Dra. Laura Benítez |
| Paciente | `44444444` | Lucía Fernández |
| Laboratorio | `55555555` | Gabriela Luna |

Para dejar todo como al principio antes de una presentación (datos y sesión), abrir cualquier página con `?reiniciar=1`, por ejemplo `login.html?reiniciar=1`.

## Cómo funciona

- `js/api.js` mantiene la interfaz del cliente real (`pedir`, `ErrorApi`, `mensajeDeError`), pero en lugar de hacer `fetch` llama a `js/demo/servidor.js`.
- `js/demo/servidor.js` responde las mismas rutas, con las mismas formas de datos y los mismos mensajes de error que la API de Spring Boot (tabla `RUTAS`). Valida igual: horarios dentro de la atención, turno ocupado, sobreturno, cobertura de la obra social, duplicados, estados del turno…
- `js/demo/datos.js` genera los datos ficticios: pacientes, profesionales, agendas con turnos de varias semanas e informes. Las fechas son relativas a hoy y se regeneran cada día.
- Los cambios que se hacen quedan en el `localStorage` del navegador (solo ahí). Para volver al principio: `?reiniciar=1`. En pantalla no hay ninguna marca de que sea una demostración.
- Los informes abren siempre el mismo PDF (`assets/informes/informe.pdf`); un PDF que se "cargue" no se guarda.

## Requisitos y comandos

Node.js, solo para compilar Tailwind y servir los archivos.

| Comando | Para qué |
| --- | --- |
| `npm install` | Instala Tailwind (la primera vez) |
| `npm run dev` | Recompila `css/output.css` cada vez que cambia un archivo |
| `npm run build` | Compila `css/output.css` minificado (antes de subir cambios) |
| `npm run servir` | Sirve la demo en `http://localhost:5174` |

## Publicación

Proyecto propio en Vercel (por ejemplo `respirar-demo.vercel.app`, o un subdominio como `demo.respirarvm.com.ar` con un CNAME). No necesita variables de entorno ni backend. `css/output.css` se sube compilado.

## Diferencias con el portal real

- **Mi agenda** (`mi-agenda.html`, `js/mi-agenda.js`, ruta `/api/mi-agenda/dia`) existe solo en esta demo: el sistema real todavía no le da al profesional una pantalla con su agenda (en el backend, `/api/turnos/**` es solo de secretaría y administración). Cuando se implemente en el real, revisar que la demo siga igual y ajustar la ruta si cambia.

## Mantenimiento

La demo copia las pantallas del portal real. Cuando el portal cambia (una pantalla nueva, un endpoint nuevo), hay que reflejarlo acá: copiar la pantalla y sus módulos, y agregar la ruta en `js/demo/servidor.js`.

## Estructura

Igual que el portal real (`login.html`, `index.html`, `turnos.html`, `pacientes.html`, `agendas.html`, `configurar-agenda.html`, `profesionales.html`, `catalogos.html`, `informes.html`, `mis-informes.html`, `personal.html`, `cambiar-clave.html`, con su `js/<pagina>.js`), más `js/demo/` (servidor simulado y datos) y `assets/informes/` (el PDF).
