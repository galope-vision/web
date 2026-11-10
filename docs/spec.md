# GALOPE — Especificación del sitio

> **Estado: BORRADOR v1 (2026-11-10).** La fuente de diseño es el Figma
> [`landing-web-2026`](https://www.figma.com/design/r88udpRUzzHIVJF9xv56c6/landing-web-2026), en
> las páginas **[actualizado] home**, **[actualizado] proyectos** y **[actualizado] estilos y
> componentes**. Las páginas viejas del mismo archivo («PROYECTOS», «DISEÑO WEB») y el PDF del
> 14/8 ya no son referencia. Lo que todavía no se sabe está marcado **A definir** y figura en
> § 13. Si este documento y `CLAUDE.md` no coinciden, se pregunta antes de seguir.

## 1. Qué es

Es el portfolio web de **GALOPE**, una dupla creativa de Buenos Aires que trabaja en
proyectos audiovisuales vinculados a la música: videoclips, documentales, visualizers, sesiones
en vivo y diseño gráfico. Está en actividad desde 2023.

Objetivos:

1. Mostrar el catálogo con una identidad visual propia: collages con movimiento y un dado que
   lleva a un proyecto al azar.
2. Que Galope publique y edite contenido **por su cuenta**, sin un desarrollador.
3. Que el costo sea **cero**: todo en planes gratuitos y en cuentas de Galope.

## 2. Alcance

**Entra:**
- Sitio estático con home, listado de proyectos, detalle de proyecto, info, contacto, guía de
  estilos interna y 404.
- **Español e inglés** (ES/EN), con la traducción al inglés generada automáticamente y
  revisable (§ 4.1).
- CMS en `/admin` (Sveltia) con borradores y una preview por borrador.
- Deploy automático a producción (DonWeb) cuando se mergea a `main`.
- Guía de carga para el cliente (`docs/guia-carga.md`).

**No entra:**
- Servidor, base de datos, SSR o cualquier servicio pago.
- Reproductor de video propio: los videos se embeben de YouTube o Vimeo y no se suben archivos.
- Blog o noticias.
- Formulario de contacto y buscador: **A definir** (§ 13).

## 3. Stack e infraestructura

| Pieza | Elección | Notas |
|---|---|---|
| Framework | Astro (última estable), TypeScript `strict` | `output: 'static'` |
| CMS | Sveltia CMS (compatible con Decap, basado en Git) | Se carga por CDN en `/admin`. Backend GitHub, `editorial_workflow`, i18n |
| Auth del CMS | Cloudflare Worker con `sveltia-cms-auth` | OAuth App de GitHub a nombre de Galope |
| Traducción | Traducción automática del CMS con DeepL API Free | La API key es de Galope y se carga en el navegador de quien edita, no en el repo. Validar en la fase 1 |
| Hosting | DonWeb, hosting compartido (Apache) | Solo archivos estáticos |
| Deploy | GitHub Actions → FTPS (`SamKirkland/FTP-Deploy-Action`) | En cada push a `main` |
| DNS | GoDaddy | No se mueve |
| Previews | Cloudflare Pages | Una por rama `cms/*` y una por PR de código. `noindex` |
| Analítica | Cloudflare Web Analytics | Solo en producción, sin cookies |
| Animación | Motion (motion.dev): `animate`, `inView`, `stagger` | La deriva va en CSS y el parallax en `src/scripts/motion.ts` |

Las cuentas de GitHub, Cloudflare, DonWeb, GoDaddy y DeepL son de Galope. Caro administra el
repo. Las decisiones de infraestructura quedan en `docs/adr/`.

## 4. Flujo editorial

1. Galope entra a `/admin`, se loguea con GitHub y crea o edita un proyecto en español.
2. Para el inglés, aprieta el botón de traducción automática del CMS. Revisa el texto y lo
   corrige si hace falta (§ 4.1).
3. Al guardar, Sveltia crea una rama `cms/<colección>/<slug>` con el borrador.
4. Cloudflare Pages publica una **preview** de esa rama con `noindex`.
5. El build valida el contenido con Zod. Si un dato está mal, falla la preview y **nunca
   producción**.
6. Galope aprieta «Publicar». El borrador se mergea a `main` y la Action despliega a DonWeb.

Commits del CMS: tipo `content` (Conventional Commits). Nadie toca a mano las ramas `cms/*`.
Hay que validar en la fase 1 si el check obligatorio de CI bloquea el «Publicar» de Sveltia.

### 4.1 Traducciones

- El español es el idioma por defecto y el que se carga primero. El inglés se genera con
  DeepL desde el CMS y queda guardado en el repo como texto normal, así que se puede editar.
- La traducción **no** se genera en el build: así el build no depende de una API externa y los
  textos en inglés no cambian solos.
- Si falta el inglés de un campo, se muestra el español. El build avisa pero no falla.
- Los textos fijos de la interfaz (nav, «Más Info», «VOLVER», etc.) se traducen una sola vez
  a mano en un diccionario del código.
- URLs: el español va sin prefijo (`/proyectos/111`) y el inglés con `/en/` (`/en/projects/111`).
  El selector `ES/EN` lleva a la misma página en el otro idioma.
- No se traducen los títulos de proyecto, los nombres propios ni los créditos.

## 5. Páginas

### 5.0 Común a todas

- **Nav** en una fila arriba: `PROYECTOS · INFO · CONTACTO · ES/EN`, un ítem por columna de la
  grilla. El activo va en rojo y subrayado (Bold 13).
- **Dado** arriba al centro, debajo del nav. Se tambalea cada ~6 s. Al hacer click gira y
  navega a un proyecto al azar entre los que tienen `inDice: true`. El sorteo es del lado del
  cliente.
  - **A definir**: si excluye el proyecto que se está viendo.
- **Logo GALOPE** abajo al centro (SVG vectorizado).
- Fondo negro.

### 5.1 Home (`/`)

- En el centro, imágenes o un video tomados al azar de `ajustes/home.yml`, distintos en cada
  visita. El sorteo es del lado del cliente.
- El dado lleva a un proyecto al azar, igual que en el resto del sitio.
- Cómo se disponen las imágenes (una sola, varias en collage): **A definir** con el diseño.

### 5.2 Proyectos (`/proyectos`)

- A la izquierda, la lista de proyectos agrupados por `group`, con un espacio entre grupos.
  Cada fila muestra el título (Bold 16) y, en otra columna, el `type` entre paréntesis
  (Regular 16).
- Detrás de la lista va un **collage general** con imágenes de todos los proyectos.
- Al pasar el mouse por un nombre, o al llegarle con el foco del teclado, se ve el collage de
  ese proyecto con un fundido de 200 ms. La fila activa va en rojo y subrayada.
- Orden: por `order` dentro de cada grupo. El orden de los grupos sale del orden de sus
  opciones en el CMS.
- Solo se muestran los proyectos con `visible: true`.

### 5.3 Detalle de proyecto (`/proyectos/[slug]`)

Tiene dos estados, y el toggle no cambia la URL:

- **Más info** (el estado inicial): un panel a la izquierda, encima del collage, con:
  - el título en rojo (Bold 16)
  - la descripción (≤ ~600 caracteres)
  - «Partes del proyecto», con los links **Fotos · Vídeos · Proceso**. Cada link hace scroll
    a su sección, debajo del collage. Si una parte está vacía, su link no aparece.
  - «Créditos»: el rol y, al lado, el nombre. El nombre es un link si tiene `url`.
  - «Menos Info», que oculta el panel
  - «VOLVER», que lleva al listado
- **Menos info**: solo el título, el collage, «Más Info» y «VOLVER».

Debajo del collage van las secciones **Fotos**, **Vídeos** y **Proceso**, con todas las
imágenes y los videos del proyecto. El collage muestra como máximo 8 imágenes.

El «conteo» que se muestra (imágenes + videos), si se usa, **se calcula** y no se guarda.

### 5.4 Info (`/info`)

- A la izquierda, el logo chico y el texto de `ajustes/general.yml`. Algunas palabras van
  destacadas (Bold 16 subrayado).
- A la derecha hay una imagen. Al pasar el mouse por una palabra destacada, o al llegarle con
  el foco, la imagen cambia por la de esa palabra con un fundido y una rotación leve.
- Texto actual: «GALOPE es una **dupla creativa** con base en **Buenos Aires.** Desde su puesta
  en activo en 2023 lleva trabajando en proyectos musicales de distinto tipo. Los encargos
  realizados han requerido de distintas búsquedas en cuanto al audiovisual y lo gráfico por lo
  que cuentan con un catálogo de **todo tipo de propuestas.**»

### 5.5 Contacto (`/contacto`)

- Email y redes de `ajustes/general.yml`. Diseño: **A definir**.

### 5.6 Estilos (`/estilos`)

- Página interna con los tokens y componentes, para revisar el diseño. `noindex`.

### 5.7 404

- Página propia. Apache la sirve con `.htaccess`.

## 6. Modelo de contenido

Todos los campos del CMS tienen una regla Zod equivalente en `src/content.config.ts`.
Marcados con 🌐: se traducen (i18n de Sveltia). El resto es igual en los dos idiomas.

### 6.1 `proyectos` (colección por carpeta)

`path: {{slug}}/index`. Las imágenes se guardan al lado del `index.md`.

| Campo | Tipo | Regla |
|---|---|---|
| `title` | string | Obligatorio. No se traduce |
| `group` | select | Obligatorio. Guarda una clave; la etiqueta ES/EN sale del diccionario. Opciones: **A definir** |
| `type` | select | Obligatorio. Guarda una clave; la etiqueta ES/EN sale del diccionario. Opciones: **A definir** |
| `categories` | multi-select | Opcional. Claves, como `type`. Opciones: **A definir** |
| `quote` 🌐 | string | Opcional |
| `description` 🌐 | texto | ≤ ~600 caracteres |
| `credits` | lista de `{ role 🌐, name, url? }` | `url` es opcional. Si está, tiene que ser una URL válida |
| `cover` | imagen | Obligatorio |
| `gallery` | lista de `{ image, part, focus, alt 🌐 }` | `part`: `fotos` \| `proceso`. `focus`: `center\|top\|bottom\|left\|right`. `alt` obligatorio |
| `videos` | lista de URLs | Solo YouTube o Vimeo, validadas |
| `collageSeed` | número | Opcional, por defecto 0. Cambiarlo «mezcla» el collage (§ 7) |
| `order` | número | |
| `inDice` | booleano | Entra o no en el sorteo del dado |
| `visible` | booleano | Por defecto `true` |
| `date` | fecha | |

### 6.2 `ajustes/general.yml`

- Texto de info 🌐, escrito normal, sin marcas.
- Las frases destacadas: `{ phrase 🌐, image, alt 🌐 }`. Cada frase tiene que aparecer tal cual
  en el texto, o el build falla.
- Email, redes, SEO por defecto (título 🌐 y descripción 🌐) e imagen para compartir por
  defecto.

### 6.3 `ajustes/home.yml`

Imágenes al azar para la home (`{ image, alt 🌐 }`) y un video destacado opcional.

### 6.4 Catálogo inicial

En tres grupos:
- 111 · 111 (Documental) · 111 (Liveset)
- 166 · Los Epílogos (166) · 18
- 166 Deluxe · CD Morón · LVEMC · Singles

Texto de ejemplo («111 (Documental)»): «Primer proyecto de la mano de Milo J donde cubrimos la
parte audiovisual del EP. Realizamos 6 visualizers (pensados en 6 planos) dirigidos por Luca
Piñeyro y 3 videoclips (realizados en España y México) dirigidos por Ballve.»

Faltan las fotos, los videos, los créditos y los valores de tipo de cada proyecto (§ 13).

## 7. Collage

Es un punto medio entre una composición fija y una generada libremente: posiciones al azar
**dentro de un patrón**, con límites y con una composición de respaldo.

- **Patrón**: el área del collage se divide en celdas sobre la grilla de 4 columnas, por ejemplo
  4 × 3. Las zonas del dado y del logo quedan reservadas. Cada imagen ocupa una celda.
- **Tamaño**: según la proporción de la imagen (vertical, horizontal o cuadrada), cada una toma
  uno de 3 tamaños predefinidos, de 1 a 2 celdas.
- **Variación**: dentro de su celda, cada imagen se corre hasta un 25% del tamaño de la celda.
  Las imágenes se pueden superponer, pero como máximo un 40% del área de la más chica.
- **Aleatorio pero estable**: el azar sale de una semilla (`slug` + `collageSeed`), así que el
  mismo proyecto da siempre el mismo collage. Se calcula en el build, sin JS para acomodar
  nada y sin saltos de layout. Si a Galope no le gusta cómo quedó, cambia el número
  «Mezclar collage» (`collageSeed`) en el CMS y lo ve en la preview.
- **Respaldo**: si con una semilla no se cumplen los límites, se prueban otras. Si ninguna
  sirve, se usa la composición fija del Figma. Nunca sale un collage roto.
- **Cantidad**: hasta 8 imágenes, tomadas de `gallery` en orden. El resto queda solo en las
  secciones Fotos y Proceso.
- **Mobile**: el mismo algoritmo con un patrón de 2 columnas.
- El collage general del listado usa el mismo algoritmo con la portada (`cover`) de cada
  proyecto.
- Las imágenes usan `object-fit: cover` y `object-position` según `focus`.

Costo estimado: unos 2 o 3 días de desarrollo dentro de la fase 3. Corre en el build, así que
no tiene costo en servicios ni en rendimiento.

## 8. Movimiento

- Solo se animan `transform` y `opacity`.
- **Entrada**: opacity 0→1, translateY 24px→0, scale .96→1 y rotate ±1.5°→0. Dura 600 ms, con
  stagger de 80 ms y ease-out, al entrar en viewport (`inView`).
- **Deriva idle**: ±6 px / ±0.6°, en un loop de 8–12 s, con offset determinístico por índice
  (sin `Math.random` en el setup de CSS).
- **Parallax con el mouse**: profundidad entre 0.2 y 1, máximo 12 px, con lerp. Desactivado en
  touch.
- **Hover de imagen**: la imagen apuntada pasa a scale 1.03 y queda arriba, y las demás bajan
  al 60% de opacidad. Dura 250 ms.
- **Listado**: el cambio al collage de un proyecto es un fundido de 200 ms.
- **Info**: el cambio de imagen es un fundido con una rotación leve.
- **`prefers-reduced-motion: reduce`**: sin deriva ni parallax, y las entradas y cambios son
  solo un fade.
- Las animaciones se pausan fuera de pantalla y con la pestaña oculta.

## 9. Diseño y tokens

Todos los valores visuales salen de `src/styles/tokens.css` (`--color-*`, `--font-*`, `--fs-*`,
`--space-*`, `--ease-*`, `--dur-*`). No se hardcodea ningún valor en los componentes. Los
valores del Figma [actualizado] son:

| | Valor |
|---|---|
| `color/negro` | `#000000` (fondo) |
| `color/rojo` | `#C42626` (acento, logo, dado, activo) |
| `color/claro` | `#E6E6E6` (texto) |
| `color/placeholder-imagen` | `#786E5B` al 70% |
| Tipografía | Baskerville Bold y Regular. En Figma se usa Libre Baskerville como reemplazo |
| Logo | Egyptienne Com Bold Extended, vectorizado en SVG: no se carga como fuente |

Estilos de texto:

| Estilo | Uso |
|---|---|
| Nav / Bold 13 | Navegación |
| Nav / Bold 13 subrayado | Link activo del header (rojo) |
| Texto / Bold 16 | Nombres de proyecto, títulos |
| Texto / Regular 16 | Cuerpo, (Tipo), roles de créditos |
| Link / Bold 16 | Proyecto activo (rojo), VOLVER, destacados de Info |
| Link / Regular 16 | Fotos / Vídeos / Proceso, nombres en créditos, Más/Menos Info |

Grilla: 4 columnas, márgenes de 9 px y gutters de 18 px. Las pantallas se diseñaron en
1366 × 768. Mobile: adaptación propia, salvo que llegue un diseño.

Licencia web de Baskerville: **A definir**. Si no hay, queda Libre Baskerville (OFL).

## 10. Accesibilidad, performance y SEO

- `alt` obligatorio en todas las imágenes (lo valida Zod).
- Foco visible. La lista, el dado, el toggle de info, las palabras destacadas de Info y las
  secciones del proyecto se pueden usar con teclado. Todo lo que pasa con hover también pasa
  con foco.
- Contraste: el texto claro `#E6E6E6` sobre negro da 16.8:1 y cumple AA. El rojo `#C42626`
  sobre negro da **3.65:1**: alcanza para el logo y el dado, pero **no llega a AA (4.5:1)**
  para texto de 13 o 16 px, ni siquiera en Bold. El diseño usa el rojo justo en ese tipo de
  texto (título del proyecto, fila activa, link activo del nav). Cómo se resuelve: **A definir**
  (§ 13). Si el texto queda encima de imágenes del collage, también se revisa el contraste.
- Lighthouse Performance ≥ 90 en mobile con el collage animado.
- Las imágenes se optimizan en el build (`astro:assets`).
- Metadatos SEO y OG desde `ajustes/general.yml`, con override por proyecto. `hreflang` entre
  ES y EN. Las previews llevan `noindex`.

## 11. Entornos

| Entorno | Dónde | Cuándo |
|---|---|---|
| Local | `npm run dev` | — |
| Preview | Cloudflare Pages | Cada rama `cms/*` y cada PR |
| Producción | DonWeb (FTPS) | Merge a `main` |

## 12. Fases

| Fase | Contenido | Tag |
|---|---|---|
| 0 | Setup: tooling, convenciones, CI | v0.1.0 |
| 1 | CMS, modelo de contenido e i18n | v0.2.0 |
| 2 | Estructura, tokens reales y páginas estáticas | v0.3.0 |
| 3 | Proyectos (listado, detalle, collage) | v0.4.0 |
| 4 | Movimiento | v0.5.0 |
| 5 | Previews y extras | v0.6.0 |
| 6 | Producción en DonWeb | v0.9.0 |
| 7 | Contenido final y entrega | v1.0.0 |

## 13. Decisiones abiertas

**De diseño**
- Cómo se disponen las imágenes o el video en la home.
- Diseño de Contacto.
- Diseño mobile (por defecto, adaptación propia).
- Si las fotos reales van al 70% de opacidad, como el placeholder.
- Cómo se ven las secciones Fotos, Vídeos y Proceso debajo del collage.
- Contraste del rojo en texto (3.65:1, no llega a AA). Opciones: aclarar el rojo solo para
  texto (por ejemplo, un token `--color-accent-text` con ≥ 4.5:1), o aceptarlo como excepción
  dejando el subrayado como indicador que no depende del color.

**De alcance**
- Página de búsqueda y formulario de contacto: si entran o no.
- Si el dado excluye el proyecto actual.

**De contenido (cliente)**
- Opciones de `group`, `type` y `categories`.
- Fotos, videos, créditos (con sus URLs) y textos reales de cada proyecto.
- Email y redes reales.
- Licencia web de Baskerville.
- Cuenta de DeepL API Free de Galope.

**De infraestructura (validar en la fase 1)**
- Si el check obligatorio de CI bloquea el «Publicar» de Sveltia.
- Si Sveltia soporta templates de preview custom completos.
- La traducción automática de Sveltia con DeepL: cómo se configura y sus límites.
- Dominio final y datos de DonWeb.
- Cuenta de GitHub de quienes van a editar (el backend GitHub la exige).

## 14. Antecedentes

Hubo una versión anterior del proyecto (`Documentos/Trabajo/galope`, con Decap y Vercel →
DonWeb, bilingüe y una home en forma de lista). Este proyecto la **reemplaza** con el stack y
el diseño de este documento. No se migra código, pero se puede consultar cómo resolvió el
bilingüe. Si alguna decisión de esa versión vuelve a aparecer, se registra como ADR.
