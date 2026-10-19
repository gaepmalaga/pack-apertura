# Plantilla de webs para negocios locales

Una sola plantilla de [Astro](https://astro.build) que genera:

| Dirección | Qué es |
|---|---|
| `/` | La landing del Pack Apertura, con el cliente real y todas las demos |
| `/demo/<negocio>/` | La web de cada negocio, generada desde su JSON |
| `/demo/<negocio>/admin/` | Panel de prueba, sin contraseña: el dueño cambia frase, teléfono, horario y precios y ve su web con esos cambios. No publica nada |
| `/demo/<negocio>/editar/` | Panel real de ese negocio (Sveltia CMS, con token de GitHub): guarda y publica |
| `/admin/` | Tu panel real, con todos los negocios a la vez |

Publicada en GitHub Pages: `https://gaepmalaga.github.io/pack-apertura/`.

## Añadir una demo nueva

1. Copia uno de los archivos de `src/negocios/` con el nombre que quieras en la
   dirección (`src/negocios/bar-paco.json` → `/demo/bar-paco/`).
2. Cambia los datos. Los bloques sin datos no aparecen: un bar sin `servicios`
   no tiene sección de servicios, un taller sin `carta` no tiene carta.
3. Elige su cara en `tema`: `portada` (`rotulo`, `cartel`, `ficha` o `banda`),
   `adorno` (`toldo`, `cuadricula`, `olas` o `ninguno`), `carta` (`tarjetas` o
   `menu`) y `forma` (`redondo` o `recto`), además de colores y `estilo` de letra.
   Dos negocios no deberían repetir combinación.
4. Deja `"demo": true` mientras no sea cliente. Eso pone el aviso de «propuesta»
   arriba y abajo, y le dice a Google que no la indexe.
5. Saca su miniatura para la landing con `npm run build && npm run preview` y,
   en otra terminal, `node herramientas/capturas.mjs` (guarda
   `public/capturas/<negocio>.jpg`). Sin captura, la landing pinta su rótulo.
6. Haz push a `main`. En un par de minutos está publicada y aparece sola en la landing.

Para una taberna que ya tenga su `contenido.json` en webtaller:

```sh
node herramientas/importar-taberna.mjs ../webtaller/churriana/datos/contenido.json la-taberna-de-churriana
```

### Qué trae cada web

- **«Abierto ahora · hasta las 20:00»**, calculado con la hora de Madrid. Admite
  horarios partidos y tramos que pasan de medianoche (12:00–01:00).
- **Carta** por secciones, con la lista de «lo que te vas a pedir»: tocar un
  plato lo apunta con su precio y lleva la cuenta. Se queda en el móvil.
- **Propuestas «por dónde empezar»** con precio.
- **Servicios**, **destacados**, **reseñas** y **preguntas frecuentes**.
- **Reservas sin servidor ni APIs de pago**: el formulario abre WhatsApp con el
  mensaje ya escrito (día, hora, personas o servicio, nombre). Si el negocio no
  tiene WhatsApp, lleva al teléfono.
- **Horario** con el día de hoy resaltado y **cómo llegar** con Google Maps.
- **Barra fija en el móvil**: llamar, WhatsApp y reservar.
- Colores y letra propios de cada negocio desde `tema` (estilos `taberna`,
  `elegante` y `moderno`).

## Los paneles

**De prueba** (`/demo/<negocio>/admin/`): para enseñárselo al dueño. Lo que
cambia se guarda en su navegador y la web lo muestra al abrirse con `?prueba`,
con un aviso azul de que no se ha publicado nada.

**Real** (`/admin/` y `/demo/<negocio>/editar/`):

Es [Sveltia CMS](https://github.com/sveltia/sveltia-cms) (código abierto, MIT):
edita el JSON del negocio con formularios y cada «Guardar» es un commit a `main`,
que vuelve a publicar la web. No necesita servidor.

Para entrar: **Sign In Using Access Token** con un token de GitHub
*fine-grained* con permiso **Contents: Read and write** sobre este repositorio.

Importante: el token da acceso a todo el repositorio. Para un **cliente real**,
su web va en un repositorio propio (copia de esta plantilla con solo su JSON),
y su token solo vale para ese repositorio.

## Publicar

Una sola vez: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Después, cada push a `main` publica (`.github/workflows/publicar.yml`). La
subcarpeta y el repositorio del panel salen del nombre del repo, así que se
puede renombrar sin tocar código.

En local:

```sh
npm install
npm run dev      # http://localhost:4321/pack-apertura/
npm run build
```

## De dónde sale cada pieza

- Cálculo de «abierto ahora», horario agrupado y barra del móvil: de **Siente**.
- Carta desde JSON, propuestas para indecisos y lista de lo que te vas a pedir:
  de las **tabernas de webtaller**.
- Aviso de demo, `noindex` y estructura de datos de negocio: nuevos.

## Proyectos de código abierto útiles para crecer

| Proyecto | Para qué |
|---|---|
| [Sveltia CMS](https://github.com/sveltia/sveltia-cms) | El panel /admin (ya en uso) |
| [Decap CMS](https://github.com/decaporg/decap-cms) | Alternativa más veterana al panel |
| [Cal.com](https://github.com/calcom/cal.com) | Citas con calendario real si un cliente lo necesita |
| [Umami](https://github.com/umami-software/umami) | Estadísticas de visitas sin cookies para el informe mensual |
| [qrcode](https://github.com/soldair/node-qrcode) | Generar los QR de mesa y de reseñas |
