# Qué falta configurar, y dónde

Estado al 2026-11-16. El sitio está en producción en <https://ga-lo-pe.com> y desde el
2026-11-16 cada merge a `main` se publica solo por FTPS (punto 2). Hasta el lanzamiento, producción muestra
solo la página de espera (dado, fecha e Instagram) y el sitio entero vive en
<https://dev.galope-web.pages.dev>, con `noindex`. Para lanzar, en
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) se cambia `LAUNCHED: 'false'`
a `'true'` y se mergea. Todo lo que falta acá es configuración
en paneles: no hay código pendiente de escribir para ninguno de estos puntos.

Cada ítem dice **dónde** se hace, **quién** puede hacerlo y **qué desbloquea**. Los documentos
técnicos de cada tema están linkeados al final de su sección.

---

## Lo primero: no hay ningún rol "Admin" que dar

`galope-vision` es una **cuenta personal** de GitHub, no una organización. En los repositorios de
una cuenta personal los colaboradores tienen un único nivel de acceso — **escritura** — y no
existe el selector de roles (Read / Triage / Write / Maintain / Admin): eso solo aparece en
repositorios de organización.

Comprobado en el panel el 2026-11-12: en **Settings → Collaborators**, la fila de `CaroBilkis`
tiene un botón para quitarla del repositorio y nada más. No hay menú de rol.

**Consecuencia: el dueño de `galope-vision` es el único admin posible.** Todo lo que viva en
_Settings_ — los puntos 1, 2 y 3 — lo tiene que hacer él. Desde una cuenta con escritura, la API
de GitHub contesta `404` a esas escrituras (no `403`: GitHub no revela si el recurso existe
cuando no tenés permiso sobre él).

Hay dos caminos:

> ### Opción A · Que los haga Galope
>
> Sin cambiar nada de estructura. Son unos 15 minutos siguiendo los puntos 1 a 3 de este
> documento, una sola vez.

> ### Opción B · Pasar el repositorio a una organización
>
> Crear una organización de GitHub (gratis, Galope queda como dueño), transferirle el
> repositorio y recién ahí darle a Caro el rol **Admin**. Deja de aparecer este problema cada vez
> que haya que tocar una configuración.
>
> **Lo que cuesta:** cambia el nombre del repositorio (`galope-vision/web` → `<org>/web`), así
> que hay que actualizar `repo:` en [`public/admin/config.yml`](../public/admin/config.yml), la
> OAuth App del CMS, el remote de git y estos documentos. GitHub redirige la URL vieja, pero el
> backend del CMS quiere el nombre exacto.

Mientras no se decida, vale la Opción A: los puntos 1 a 3 los hace Galope.

---

## En GitHub · `galope-vision/web`

### 1 · Activar "Allow auto-merge" — ✅ hecho el 2026-11-13

- **Dónde:** <https://github.com/galope-vision/web/settings> → sección **Pull Requests** →
  tildar **Allow auto-merge**
- **Quién:** Galope (ver arriba: en un repo de cuenta personal no hay otro admin)
- **Estado:** activado desde la sesión del dueño. Verificado por la API:
  `allow_auto_merge=true`, con `allow_squash_merge=true` y el resto de las opciones de merge
  sin cambios.
- **Desbloquea:** **publicar desde el CMS.** Cuando Galope aprieta "Publicar", el CMS mergea el PR
  de esa entrada. Si CI todavía está corriendo, el CMS prende auto-merge y espera. Sin esta
  opción, publicar falla mientras corre el check y hay que reintentar a mano.

### 2 · Cargar los secrets del deploy a DonWeb — ✅ hecho el 2026-11-16

- **Dónde:** <https://github.com/galope-vision/web/settings/secrets/actions>
- **Quién:** Galope (ver arriba: en un repo de cuenta personal no hay otro admin)
- **Antes hace falta:** el punto 6 (confirmar el directorio y el usuario FTP en DonWeb)

Pestaña **Secrets** → _New repository secret_, tres veces:

| Nombre         | Valor                                   |
| -------------- | --------------------------------------- |
| `FTP_SERVER`   | `200.58.111.133` (o `ftp.ga-lo-pe.com`) |
| `FTP_USERNAME` | el usuario FTP de la cuenta de hosting  |
| `FTP_PASSWORD` | la contraseña de ese usuario            |

Pestaña **Variables** → _New repository variable_, una vez:

| Nombre           | Valor                                                          |
| ---------------- | -------------------------------------------------------------- |
| `FTP_SERVER_DIR` | `/public_html/` — **con la barra final** (confirmado, punto 6) |

`FTP_SERVER_DIR` va como _variable_ y no como secret a propósito: así aparece en los logs y se ve
de una si un deploy fue a parar al lugar equivocado.

- **Estado:** cargados. La variable había quedado en `/httpdocs/` y el workflow frenó cuatro
  deploys a propósito; con `/public_html/` el primer deploy automático (el del PR #57) subió los
  424 archivos el 2026-11-16. Un primer intento se cortó con `ECONNRESET` en el canal de datos
  antes de subir nada, y relanzarlo alcanzó: si vuelve a pasar, se relanza.
- **Desbloquea:** que cada merge a `main` publique solo, incluido lo que publique Galope desde el
  CMS.
- **Ojo:** ese primer deploy publicó el sitio entero en `ga-lo-pe.com`. Desde el PR #59, mientras
  `LAUNCHED` sea `'false'`, el deploy recorta el build a la página de espera y la sincronización
  borra del servidor el resto; todo `main` se publica en `dev.galope-web.pages.dev`.
- **Detalle técnico:** [`deploy-setup.md`](deploy-setup.md) (llega con el PR #22)

### 3 · Cargar los secrets de las previews — ✅ hecho el 2026-11-13

- **Dónde:** <https://github.com/galope-vision/web/settings/secrets/actions>
- **Quién:** Galope (ver arriba: en un repo de cuenta personal no hay otro admin)
- **Antes hace falta:** el punto 5 (crear el proyecto y el token en Cloudflare)

| Nombre                  | Valor                       |
| ----------------------- | --------------------------- |
| `CLOUDFLARE_API_TOKEN`  | el token del punto 5        |
| `CLOUDFLARE_ACCOUNT_ID` | el ID de cuenta del punto 5 |

- **Estado:** cargados. Verificado re-corriendo el workflow sobre el PR #33: buildeó, desplegó
  y comentó la URL, y la preview responde `200` con `x-robots-tag: noindex` y sin analytics.
- **Desbloquea:** una URL propia por cada PR y por cada borrador del CMS, para ver los cambios
  antes de que lleguen a producción.
- **Detalle técnico:** [`preview-setup.md`](preview-setup.md) (llega con el PR #33)

---

## En Cloudflare · cuenta de Galope

Es la misma cuenta donde ya está corriendo el Worker del CMS.

### 4 · Terminar de configurar el Worker del CMS — ✅ hecho el 2026-11-16

- **Dónde:** dashboard de Cloudflare → **Workers & Pages** → `sveltia-cms-auth` →
  **Settings → Variables and Secrets**
- **Quién:** Galope, o Caro desde la cuenta de Cloudflare de Galope

| Variable               | Valor                                                                        |
| ---------------------- | ---------------------------------------------------------------------------- |
| `GITHUB_CLIENT_ID`     | el Client ID de la OAuth App **GALOPE CMS**                                  |
| `GITHUB_CLIENT_SECRET` | el Client Secret, encriptado                                                 |
| `ALLOWED_DOMAINS`      | `ga-lo-pe.com, *.ga-lo-pe.com, galope-web.pages.dev, *.galope-web.pages.dev` |

- **Estado:** funciona de punta a punta en las previews. El 2026-11-16 se sumó
  `*.galope-web.pages.dev` a `ALLOWED_DOMAINS`. Verificado con `curl`: las URLs de rama y de hash
  de las previews pasan a GitHub, y `example.org` y `evil.pages.dev` siguen rechazados. Después
  Caro hizo un login real en una preview (`/admin/` → _Iniciar sesión con GitHub_ → autorizar),
  así que el Client Secret y la callback URL están bien. También guardó un borrador de prueba
  (PR #56): el CMS creó la rama `cms/proyectos/bizarrap-session-57`, el PR y su preview.
- **Lo que apareció en esa prueba:** el CMS titulaba los PR `Update Proyecto “…”`, sin tipo de
  Conventional Commits, y el check obligatorio _PR title_ los rechazaba. Con eso, «Publicar» se
  habría quedado esperando el auto-merge para siempre. Se arregló con `commit_messages` en
  [`public/admin/config.yml`](../public/admin/config.yml): ahora los títulos empiezan con
  `content:`.
- **Ojo si se vuelve a tocar:** **nunca poner `*.pages.dev` solo**, porque le daría el
  autenticador de Galope a cualquier sitio de Cloudflare Pages. Y como el Worker se redespliega
  en cada push a `galope-vision/sveltia-cms-auth`, conviene editar las variables existentes sin
  cambiarles el tipo (ver [`cms-auth-setup.md`](cms-auth-setup.md)).
- **Producción:** desde el primer deploy automático (punto 2), `ga-lo-pe.com/admin` sirve el
  config con el Worker. Caro probó el login ahí el 2026-11-16 y funciona.
- **Detalle técnico:** [`cms-auth-setup.md`](cms-auth-setup.md)

### 5 · Crear el proyecto de Pages y su token — ✅ hecho el 2026-11-13

- **Dónde:** dashboard de Cloudflare
- **Quién:** Galope, o Caro si le dan acceso a la cuenta de Cloudflare

1. ✅ **Workers & Pages → Create → Pages → Upload assets.** Hecho el 2026-11-13: el proyecto
   _Direct Upload_ **`galope-web`** existe y <https://galope-web.pages.dev> responde `200`.
   No está conectado a Git, que es lo correcto: el build vive en este repositorio.
2. ✅ El nombre quedó exactamente **`galope-web`**, que es el que usa el workflow.
3. ✅ Para crearlo pedía subir algo: se subió un `index.html` con `noindex`. Ojo, ese archivo
   **no es descartable**: como el workflow solo despliega ramas de preview, es lo que
   `galope-web.pages.dev` va a seguir sirviendo.
4. ✅ El token: **My Profile → API Tokens → Create Token → Custom token**, con el permiso
   **Account · Cloudflare Pages · Edit**, y en _Resources_ incluir **solo la cuenta de Galope**.
   Cloudflare muestra el token una sola vez.
5. El **Account ID** está en la barra lateral del dashboard de la cuenta.

- **Desbloquea:** el punto 3.
- **Detalle técnico:** [`preview-setup.md`](preview-setup.md) (llega con el PR #33)

---

## En DonWeb · panel Ferozo

Cuenta de Galope. Panel en <https://panel.ferozo.com>, plan _Web Hosting Plan Full_, servicio
`#6624915`.

### 6 · Confirmar el directorio web y crear un usuario FTP — directorio ✅

- **Quién:** Galope, o Caro con acceso al panel

1. ✅ **El directorio web es `/public_html/`.** Confirmado el 2026-11-13 sobre el árbol FTP real
   de la cuenta, que es donde se subió a mano el build que está hoy en producción. Está junto a
   `etc`, `mail`, `logos`, `storagedir`, `tmp` y `tmpsite`.

   Ojo con esto: la documentación de Ferozo suele decir `/httpdocs/`, y **esta cuenta no usa ese
   esquema**. Si el valor queda mal, el sitio se sube al directorio padre, donde no lo sirve
   nadie, y el deploy igual informa éxito.

2. ⬜ Si el panel lo permite, crear un **usuario FTP dedicado** para el deploy, limitado a ese
   directorio. Así las credenciales que viven en GitHub no son las de la cuenta entera. Esto lo
   tiene que hacer Galope, porque implica fijarle una contraseña.

- **Desbloquea:** el punto 2.

El DNS y el certificado ya están listos: los nameservers se delegaron a DonWeb el 2026-11-11 y el
certificado wildcard se emitió ese mismo día. No hay nada que tocar ahí.

---

## Cosas que tiene que mandar Galope

No son de panel, pero frenan el contenido real del sitio.

| Qué                                            | Para qué                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| **Email real de contacto**                     | Hoy el sitio publica `hola@example.com`, que es un placeholder             |
| **Cuentas de GitHub de quienes van a editar**  | El CMS usa login de GitHub; cada una necesita permiso de escritura al repo |
| **Opciones de `group`, `type` y `categories`** | Son las listas desplegables del CMS al cargar un proyecto                  |
| **API key de Google Gemini** (plan gratis)     | La traducción automática ES→EN dentro del CMS                              |
| **Licencia web de Baskerville**                | La tipografía del sitio                                                    |
| **Fotos, videos, créditos y textos**           | Los proyectos de verdad                                                    |

La API key de Gemini se carga en el navegador del editor desde el propio CMS: **nunca** va al
repositorio.

---

## Decisiones de diseño que siguen abiertas

Estas son de Caro y Galope, y frenan la fase 3 (proyectos y collage):

- Cómo se disponen las imágenes o el video en la home.
- Cómo se ven las secciones Fotos, Vídeos y Proceso debajo del collage.
- Diseño de Contacto y diseño mobile.
- Si las fotos reales van al 70% de opacidad, como el placeholder.
- Si el dado excluye el proyecto que se está viendo.
- Si entran una página de búsqueda y un formulario de contacto.

La lista completa está en [`spec.md`](spec.md) § 13.

---

## Resumen: qué pasa si no se hace cada cosa

| Sin esto                         | Lo que sigue sin andar                         |
| -------------------------------- | ---------------------------------------------- |
| ~~1 · Auto-merge~~ ✅            | — ya está activado                             |
| ~~2 · Secrets de FTP~~ ✅        | — cada merge a `main` se publica solo          |
| ~~3 · Secrets de Cloudflare~~ ✅ | — ya están cargados y las previews andan       |
| ~~4 · Worker del CMS~~ ✅        | — el login anda en previews y en producción    |
| ~~5 · Proyecto y token~~ ✅      | — ya está                                      |
| 6 · Usuario FTP                  | Igual que 2 (el directorio ya está confirmado) |
