# Portal Demo de Clínica Respirar

Demostración del portal (`../portal`) para mostrar el sistema a clientes: las mismas pantallas y funciones, **sin backend y con datos ficticios**. HTML + JavaScript (módulos nativos, sin framework) + Tailwind CSS 4 + CSS. Es un proyecto aparte: no se conecta a `../backend` ni a ninguna API. Cómo levantarlo: `README.md`.

## Cómo trabajar

- Idioma: español, en las respuestas y en el código (funciones, variables, ids, textos de la interfaz).
- Luciano quiere ser guiado: explicar el concepto de cada paso, ofrecer opciones con una recomendación y dejar que él decida.
- Ecosistema fijo: HTML, JavaScript, Tailwind y CSS. Sin React, Vue, TypeScript ni otro framework, salvo que Luciano lo pida.
- Los commits y el push los hace Luciano desde GitHub Desktop. No commitear salvo que lo pida; proponer el mensaje.
- Después de cambiar clases de Tailwind: `npm run build` para regenerar `css/output.css` (se sube compilado).

## Cómo está armado

- Las pantallas y los módulos (`js/agenda.js`, `js/turno.js`…) son los del portal real y siguen hablando con `pedir()` de `js/api.js`. Acá `pedir()` no hace `fetch`: llama a `js/demo/servidor.js`, que responde las mismas rutas, con las mismas formas de datos y los mismos mensajes de error que la API de Spring Boot.
- `js/demo/datos.js`: los datos ficticios y el cálculo de horarios. Las fechas son relativas a hoy y los datos se regeneran cada día. Todo es inventado: no cargar nunca datos reales de pacientes.
- Cuentas (documento / clave `1234`): administración `11111111`, secretaría `22222222`, profesional `33333333`, paciente `44444444`, laboratorio `55555555`. Se escriben en el login como en el real: no hay botones de acceso rápido.
- La interfaz no debe decir en ningún lado que es una demostración o una simulación (sin barras, avisos ni textos "de ejemplo"): tiene que verse como el sistema real. Eso vale solo para lo que ve el usuario; el código y la documentación sí lo dicen.
- Si cambian los datos de partida (cuentas, pacientes, agendas…), subir `VERSION_DATOS` en `js/demo/datos.js`: sin eso, los navegadores que ya visitaron la demo ese día siguen con la base anterior.
- Los cambios hechos en la demo viven en el `localStorage` del navegador (solo ahí); para volver al principio se abre cualquier página con `?reiniciar=1`.
- Nada de este proyecto debe llamar a una URL real: no agregar `fetch`, `API_URL` ni cookies.

## Diferencias con el portal real

- **Mi agenda** (rol PROFESIONAL) existe solo en la demo, adelantándose al sistema real, que todavía no lo tiene. Cuando el real lo implemente, alinear aquí la ruta (`/api/mi-agenda/dia`), los permisos y la pantalla. No agregar otras funciones que el real no tenga sin que Luciano lo decida.

## Mantenimiento

- Cuando el portal real agrega o cambia una pantalla o un endpoint, se refleja acá a mano: copiar la pantalla (`.html` y `js/<pagina>.js`, `js/<modulo>.js`) y agregar la ruta en la tabla `RUTAS` de `js/demo/servidor.js`, con datos de ejemplo en `datos.js` si hacen falta.
- Los informes abren siempre `assets/informes/informe.pdf`.

## Estilo

- Colores y fuente iguales al sitio (`css/stylesheet.css`): `brand`, `brand-strong` (botones con texto blanco), `brand-dark`, `dark`; Poppins.
- Piezas comunes en `css/stylesheet.css` (`tarjeta`, `boton`, `boton-secundario`, `boton-peligro`, `campo`, `etiqueta-campo`, `aviso-error`, `aviso-exito`, `tabla`, `enlace`): usarlas en lugar de repetir las clases de Tailwind.
- Datos de la "API": insertarlos con `textContent` o `createElement`, nunca con `innerHTML` (ayudas en `js/vista.js`).
- Textos en español rioplatense (vos), frases cortas, sin signos de exclamación.
