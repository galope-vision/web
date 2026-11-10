# GALOPE — Especificación del sitio

> **Estado: BORRADOR v0 (2026-11-10).** Este documento se armó a partir de `CLAUDE.md` y del
> diseño `WEB_GALOPE_Recopilado.pdf` (14/08/2026). Todo lo que viene del PDF y no está en
> `CLAUDE.md` está marcado con **[diseño 14/8]** y hay que confirmarlo. Lo que no se sabe todavía
> está marcado **A definir** y figura en § 13. Si este documento y `CLAUDE.md` no coinciden,
> se pregunta antes de seguir.

## 1. Qué es

Es el portfolio web de **GALOPE**, una dupla creativa de Buenos Aires que trabaja en
proyectos audiovisuales vinculados a la música: videoclips, documentales, visualizers, sesiones
en vivo y diseño gráfico. Está en actividad desde 2023.

Objetivos:

1. Mostrar el catálogo con una identidad visual propia: un collage con movimiento y un dado
   que lleva a un proyecto al azar.
2. Que Galope publique y edite contenido **por su cuenta**, sin un desarrollador.
3. Que el costo sea **cero**: todo en planes gratuitos y en cuentas de Galope.

## 2. Alcance

**Entra:**
- Sitio estático con home, listado de proyectos, detalle de proyecto, info, contacto, guía
  de estilos interna y 404.
- CMS en `/admin` (Sveltia) con borradores y una preview por borrador.
- Deploy automático a producción (DonWeb) cuando se mergea a `main`.
- Guía de carga para el cliente (`docs/guia-carga.md`).

**No entra:**
- Servidor, base de datos, SSR o cualquier servicio pago.
- Reproductor de video propio: los videos se embeben de YouTube o Vimeo y no se suben archivos.
- Blog o noticias.
- Formulario de contacto, buscador e idioma inglés: **A definir** (§ 13).

## 3. Stack e infraestructura

| Pieza | Elección | Notas |
|---|---|---|
| Framework | Astro (última estable), TypeScript `strict` | `output: 'static'` |
| CMS | Sveltia CMS (compatible con Decap, basado en Git) | Se carga por CDN en `/admin`. Backend GitHub, `editorial_workflow` |
| Auth del CMS | Cloudflare Worker con `sveltia-cms-auth` | OAuth App de GitHub a nombre de Galope |
| Hosting | DonWeb, hosting compartido (Apache) | Solo archivos estáticos |
| Deploy | GitHub Actions → FTPS (`SamKirkland/FTP-Deploy-Action`) | En cada push a `main` |
| DNS | GoDaddy | No se mueve |
| Previews | Cloudflare Pages | Una por rama `cms/*` y una por PR de código. `noindex` |
| Analítica | Cloudflare Web Analytics | Solo en producción, sin cookies |
| Animación | Motion (motion.dev): `animate`, `inView`, `stagger` | La deriva va en CSS y el parallax en `src/scripts/motion.ts` |

Las cuentas de GitHub, Cloudflare, DonWeb y GoDaddy son de Galope. Caro administra el repo.
Las decisiones de infraestructura quedan en `docs/adr/`.

## 4. Flujo editorial

1. Galope entra a `/admin`, se loguea con GitHub y crea o edita un proyecto.
2. Al guardar, Sveltia crea una rama `cms/<colección>/<slug>` con el borrador.
3. Cloudflare Pages publica una **preview** de esa rama con `noindex`.
4. El build valida el contenido con Zod. Si un dato está mal, falla la preview y **nunca
   producción**.
5. Galope aprieta «Publicar». El borrador se mergea a `main` y la Action despliega a DonWeb.

Commits del CMS: tipo `content` (Conventional Commits). Nadie toca a mano las ramas `cms/*`.
Hay que validar en la fase 1 si el check obligatorio de CI bloquea el «Publicar» de Sveltia.

## 5. Páginas

### 5.0 Común a todas

- **Header**: logo GALOPE centrado y 4 ítems de navegación cuadrados. El activo se pinta del
  color de acento (rojo). Qué es cada cuadrado (íconos o palabras): **A definir**.
  - [diseño 14/8] El nav muestra `PROYECTOS · INFO · CONTACTO · ES/EN`. Esos podrían ser los 4.
- **Dado**: aparece en todas las páginas. Se tambalea cada ~6 s. Al hacer click gira y
  navega a un proyecto al azar entre los que tienen `inDice: true`. El sorteo es del lado del
  cliente.
  - **A definir**: si excluye el proyecto que se está viendo.
- Idioma del sitio: español (`lang="es"`).

### 5.1 Home (`/`)

- Un collage de imágenes al azar tomadas de `ajustes/home.yml`, con entrada animada, deriva
  y parallax (§ 7).
- Video destacado opcional (`ajustes/home.yml`).
- Composición exacta del collage: **A definir** con el diseño.

### 5.2 Proyectos (`/proyectos`)

- Listado de proyectos (`ProjectList`), navegable con teclado.
- [diseño 14/8] Lista de títulos con su «(Tipo)» al lado.
- Orden: por `order`. Agrupación y filtros (por `group`, `type` o `categories`): **A definir**.
- Solo se muestran los proyectos con `visible: true`.

### 5.3 Detalle de proyecto (`/proyectos/[slug]`)

- Título, cita opcional, descripción (≤ ~600 caracteres), créditos (rol → nombre), galería
  según la plantilla elegida (§ 6) y video embebido.
- El «conteo» que se muestra (imágenes + video) **se calcula**, no se guarda.
- [diseño 14/8] Bloque «Partes del proyecto: Fotos · Vídeos · Proceso · Créditos», un toggle
  «Más info / Menos info» y un botón «VOLVER». Qué hace cada link: **A definir**.

### 5.4 Info (`/info`)

- Texto de `ajustes/general.yml`.
- [diseño 14/8] Texto actual: «GALOPE es una dupla creativa con base en Buenos Aires. Desde su
  puesta en activo en 2023 lleva trabajando en proyectos musicales de distinto tipo. Los
  encargos realizados han requerido de distintas búsquedas en cuanto al audiovisual y lo
  gráfico por lo que cuentan con un catálogo de todo tipo de propuestas.»

### 5.5 Contacto (`/contacto`)

- Email y redes de `ajustes/general.yml`. Diseño y si lleva formulario: **A definir**.

### 5.6 Estilos (`/estilos`)

- Página interna con los tokens y componentes, para revisar el diseño. `noindex`.

### 5.7 404

- Página propia. Apache la sirve con `.htaccess`.

## 6. Modelo de contenido

Todos los campos del CMS tienen una regla Zod equivalente en `src/content.config.ts`.

### 6.1 `proyectos` (colección por carpeta)

`path: {{slug}}/index`. Las imágenes se guardan al lado del `index.md`.

| Campo | Tipo | Regla |
|---|---|---|
| `title` | string | Obligatorio |
| `group` | select | Obligatorio. Opciones: **A definir** |
| `type` | select | Obligatorio. Opciones: **A definir** |
| `categories` | multi-select | Opciones: **A definir** |
| `quote` | string | Opcional |
| `description` | texto | ≤ ~600 caracteres |
| `credits` | lista de `{ role, name }` | |
| `cover` | imagen | Obligatorio |
| `galleryTemplate` | `A` \| `B` \| `C` \| `D` | Por defecto `A` |
| `gallery` | lista de `{ image, focus, alt }` | `focus`: `center\|top\|bottom\|left\|right`. `alt` obligatorio |
| `video` | URL | Solo YouTube o Vimeo, validada |
| `order` | número | |
| `inDice` | booleano | Entra o no en el sorteo del dado |
| `visible` | booleano | Por defecto `true` |
| `date` | fecha | |

### 6.2 `ajustes/general.yml`

Texto de info, email, redes, SEO por defecto (título y descripción) e imagen para compartir
por defecto.

### 6.3 `ajustes/home.yml`

Imágenes al azar para la home y un video destacado opcional.

### 6.4 Catálogo inicial conocido [diseño 14/8]

111 · 111 (Documental) · 111 (Liveset) · 166 · Los Epílogos (166) · 18 · 166 Deluxe ·
CD Morón · LVEMC · Singles.

Texto de ejemplo («111»): «Primer proyecto de la mano de Milo J donde cubrimos la parte
audiovisual del EP. Realizamos 6 visualizers (pensados en 6 planos) dirigidos por Luca Piñeyro
y 3 videoclips (realizados en España y México) dirigidos por Ballve.»

Faltan las fotos, los videos, los créditos y los valores de tipo de cada proyecto (§ 13).

## 7. Galerías

Se arman con CSS Grid y `grid-template-areas`. Las imágenes usan `object-fit: cover` y
`object-position` según `focus`.

| Plantilla | Layout | Lugares |
|---|---|---|
| A | Principal 16:9 y 2 panorámicas abajo | 3 |
| B | 3 verticales y 2 horizontales | 5 |
| C | 2 arriba y 1 ancha abajo | 3 |
| D | 1 centrada con aire y 2 abajo | 3 |

Las imágenes que sobran siguen en un área con scroll e indicador de progreso. La dirección
(horizontal o vertical) está **A definir**.

## 8. Movimiento

- Solo se animan `transform` y `opacity`.
- **Entrada**: opacity 0→1, translateY 24px→0, scale .96→1 y rotate ±1.5°→0. Dura 600 ms, con
  stagger de 80 ms y ease-out, al entrar en viewport (`inView`).
- **Deriva idle**: ±6 px / ±0.6°, en un loop de 8–12 s, con offset determinístico por índice
  (sin `Math.random` en el setup de CSS).
- **Parallax**: profundidad entre 0.2 y 1, máximo 12 px, con lerp. Desactivado en touch.
- **Hover de imagen**: la imagen apuntada pasa a scale 1.03 y queda arriba, y las demás bajan
  al 60% de opacidad. Dura 250 ms.
- **`prefers-reduced-motion: reduce`**: sin deriva ni parallax, y la entrada es solo un fade.
- Las animaciones se pausan fuera de pantalla y con la pestaña oculta.

## 9. Diseño y tokens

Todos los valores visuales salen de `src/styles/tokens.css` (`--color-*`, `--font-*`, `--fs-*`,
`--space-*`, `--ease-*`, `--dur-*`). No se hardcodea ningún valor en los componentes.

Los valores actuales son **PROVISIONALES**. Los colores, las fuentes y el logo finales llegan
más adelante. Referencia [diseño 14/8]:

| | Valor en el PDF |
|---|---|
| Colores | `#000000` · `#c42626` (acento) · `#e6e6e6` |
| Tipografía | Baskerville Bold y Regular, 16 pt y 13 pt (link activo del header: Bold 13 pt) |
| Grilla | Medianiles de 9 px |
| Logo | `GALOPE.svg`. El wordmark usa `#C52626` y la guía `#c42626`: hay que unificar |

Licencia web de Baskerville: **A definir**. Si no hay, queda Libre Baskerville.

## 10. Accesibilidad, performance y SEO

- `alt` obligatorio en todas las imágenes de galería (lo valida Zod).
- Foco visible. La lista, el dado y la galería se pueden usar con teclado.
- Contraste AA con los tokens finales.
- Lighthouse Performance ≥ 90 en mobile con el collage animado.
- Las imágenes se optimizan en el build (`astro:assets`).
- Metadatos SEO y OG desde `ajustes/general.yml`, con override por proyecto. Las previews
  llevan `noindex`.
- Mobile: adaptación propia, salvo que llegue un diseño mobile.

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
| 1 | CMS y modelo de contenido | v0.2.0 |
| 2 | Estructura y páginas estáticas | v0.3.0 |
| 3 | Proyectos (listado, detalle, galerías) | v0.4.0 |
| 4 | Movimiento | v0.5.0 |
| 5 | Previews y extras | v0.6.0 |
| 6 | Producción en DonWeb | v0.9.0 |
| 7 | Contenido final y entrega | v1.0.0 |

## 13. Decisiones abiertas

**De diseño**
- Colores, fuentes y logo finales. Fondo oscuro o claro.
- Qué es cada uno de los 4 cuadrados del header.
- Composición del collage de la home.
- Qué hacen «Partes del proyecto» y «Más info» en el detalle.
- Dirección del scroll de imágenes extra en la galería.
- Diseño mobile (por defecto, adaptación propia).

**De alcance**
- Página de búsqueda y formulario de contacto: si entran o no.
- Solo español o ES/EN.
- Si el dado excluye el proyecto actual.

**De contenido (cliente)**
- Opciones de `group`, `type` y `categories`. Qué significa «(Tipo)» en el diseño.
- Fotos, videos, créditos y textos reales de cada proyecto.
- Email y redes reales.
- Licencia web de Baskerville.

**De infraestructura (validar en la fase 1)**
- Si el check obligatorio de CI bloquea el «Publicar» de Sveltia.
- Si Sveltia soporta templates de preview custom completos.
- Dominio final y datos de DonWeb.
- Cuenta de GitHub de quienes van a editar (el backend GitHub la exige).

## 14. Antecedentes

Hubo una versión anterior del proyecto (`Documentos/Trabajo/galope`, con Decap y Vercel →
DonWeb, bilingüe y una home en forma de lista). Este proyecto la **reemplaza** con el stack y
el diseño de este documento. No se migra código. Si alguna decisión de esa versión vuelve a
aparecer, se registra como ADR.
