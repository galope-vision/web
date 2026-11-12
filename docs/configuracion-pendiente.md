# Qué falta configurar, y dónde

Estado al 2026-11-12. El sitio ya está en producción en <https://ga-lo-pe.com> con la página de
"Próximamente", pero ese build se subió **a mano** por FTP. Todo lo que falta acá es configuración
en paneles: no hay código pendiente de escribir para ninguno de estos puntos.

Cada ítem dice **dónde** se hace, **quién** puede hacerlo y **qué desbloquea**. Los documentos
técnicos de cada tema están linkeados al final de su sección.

---

## Lo primero, porque destraba casi todo

> ### 0 · Darle rol **Admin** a Caro en `galope-vision/web`
>
> - **Dónde:** <https://github.com/galope-vision/web/settings/access>
> - **Quién:** Galope. `galope-vision` es una cuenta personal de GitHub (no una organización), así
>   que esto solo lo puede hacer su dueño.
> - **Cómo:** en la fila de `CaroBilkis`, el menú **Role** → **Admin**. Hoy está en **Write**, que
>   alcanza para subir ramas y abrir PRs, pero no para tocar _Settings_.
> - **Desbloquea:** los puntos 1, 2 y 3. Sin esto, cada uno de ellos necesita que Galope entre al
>   panel.

Si Galope prefiere no dar admin, no hay problema: los puntos 1 a 3 los puede hacer Galope
siguiendo las mismas instrucciones. Son unos 15 minutos en total.

---

## En GitHub · `galope-vision/web`

### 1 · Activar "Allow auto-merge"

- **Dónde:** <https://github.com/galope-vision/web/settings> → sección **Pull Requests** →
  tildar **Allow auto-merge**
- **Quién:** Galope, o Caro con admin (punto 0)
- **Desbloquea:** **publicar desde el CMS.** Cuando Galope aprieta "Publicar", el CMS mergea el PR
  de esa entrada. Si CI todavía está corriendo, el CMS prende auto-merge y espera. Sin esta
  opción, publicar falla mientras corre el check y hay que reintentar a mano.

### 2 · Cargar los secrets del deploy a DonWeb

- **Dónde:** <https://github.com/galope-vision/web/settings/secrets/actions>
- **Quién:** Galope, o Caro con admin (punto 0)
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
| `FTP_SERVER_DIR` | `/httpdocs/` — **con la barra final**, confirmar en el punto 6 |

`FTP_SERVER_DIR` va como _variable_ y no como secret a propósito: así aparece en los logs y se ve
de una si un deploy fue a parar al lugar equivocado.

- **Desbloquea:** que cada merge a `main` publique solo. Hoy hay que buildear y subir por FTP a
  mano cada vez — incluido lo que publique Galope desde el CMS.
- **Detalle técnico:** [`deploy-setup.md`](deploy-setup.md) (llega con el PR #22)

### 3 · Cargar los secrets de las previews

- **Dónde:** <https://github.com/galope-vision/web/settings/secrets/actions>
- **Quién:** Galope, o Caro con admin (punto 0)
- **Antes hace falta:** el punto 5 (crear el proyecto y el token en Cloudflare)

| Nombre                  | Valor                       |
| ----------------------- | --------------------------- |
| `CLOUDFLARE_API_TOKEN`  | el token del punto 5        |
| `CLOUDFLARE_ACCOUNT_ID` | el ID de cuenta del punto 5 |

- **Desbloquea:** una URL propia por cada PR y por cada borrador del CMS, para ver los cambios
  antes de que lleguen a producción. Mientras no estén, el workflow corre, saltea todo y avisa en
  el log; no rompe nada ni pone checks en rojo.
- **Detalle técnico:** [`preview-setup.md`](preview-setup.md) (llega con el PR #33)

---

## En Cloudflare · cuenta de Galope

Es la misma cuenta donde ya está corriendo el Worker del CMS.

### 4 · Terminar de configurar el Worker del CMS

El Worker `sveltia-cms-auth` ya está desplegado y la OAuth App **GALOPE CMS** ya está registrada,
pero al Worker le faltan sus variables, así que **el login del CMS todavía no funciona**.

- **Dónde:** dashboard de Cloudflare → **Workers & Pages** → `sveltia-cms-auth` →
  **Settings → Variables**
- **Quién:** Galope (el client secret lo genera la cuenta de GitHub que registró la OAuth App)

| Variable               | Valor                                                    |
| ---------------------- | -------------------------------------------------------- |
| `GITHUB_CLIENT_ID`     | el Client ID de la OAuth App                             |
| `GITHUB_CLIENT_SECRET` | el Client Secret — **tildar _Encrypt_** antes de guardar |
| `ALLOWED_DOMAINS`      | `ga-lo-pe.com, *.ga-lo-pe.com, galope-web.pages.dev`     |

El Client Secret se genera en <https://github.com/settings/developers> → **GALOPE CMS** →
_Generate a new client secret_. **GitHub lo muestra una sola vez**, así que conviene pegarlo en
Cloudflare en el mismo momento.

`ALLOWED_DOMAINS` es la lista de hostnames que pueden usar el Worker para loguearse. **Nunca poner
`*.pages.dev` solo**: eso le daría el autenticador de Galope a cualquier sitio alojado en
Cloudflare Pages.

- **Desbloquea:** que Galope entre a `ga-lo-pe.com/admin` y se loguee con el botón de GitHub, en
  vez de pegar un token a mano.
- **Detalle técnico:** [`cms-auth-setup.md`](cms-auth-setup.md)

### 5 · Crear el proyecto de Pages y su token

- **Dónde:** dashboard de Cloudflare
- **Quién:** Galope, o Caro si le dan acceso a la cuenta de Cloudflare

1. **Workers & Pages → Create → Pages → Upload assets.** Esto crea un proyecto de tipo _Direct
   Upload_. **No** usar "Connect to Git": el build vive en este repositorio, no en el dashboard.
2. Llamarlo exactamente **`galope-web`**. El nombre está escrito en el workflow.
3. Para terminar de crearlo pide subir algo: cualquier carpeta con un `index.html` sirve. El
   primer deploy real lo pisa.
4. El token: **My Profile → API Tokens → Create Token → Custom token**, con el permiso
   **Account · Cloudflare Pages · Edit**, y en _Resources_ incluir **solo la cuenta de Galope**.
   Cloudflare muestra el token una sola vez.
5. El **Account ID** está en la barra lateral del dashboard de la cuenta.

- **Desbloquea:** el punto 3.
- **Detalle técnico:** [`preview-setup.md`](preview-setup.md) (llega con el PR #33)

---

## En DonWeb · panel Ferozo

Cuenta de Galope. Panel en <https://panel.ferozo.com>, plan _Web Hosting Plan Full_, servicio
`#6624915`.

### 6 · Confirmar el directorio web y crear un usuario FTP

- **Quién:** Galope, o Caro con acceso al panel

1. En el administrador de archivos, confirmar cuál es el directorio web de la cuenta. En Ferozo
   casi siempre es `/httpdocs/`. **Equivocarse acá sube el sitio al directorio padre, donde no lo
   sirve nadie**, y el deploy igual dice que salió bien.
2. Si el panel lo permite, crear un **usuario FTP dedicado** para el deploy, limitado a ese
   directorio. Así las credenciales que viven en GitHub no son las de la cuenta entera.

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

| Sin esto                     | Lo que sigue sin andar                                      |
| ---------------------------- | ----------------------------------------------------------- |
| 1 · Auto-merge               | Publicar desde el CMS falla mientras corre CI               |
| 2 · Secrets de FTP           | Cada publicación hay que subirla a mano por FTP             |
| 3 · Secrets de Cloudflare    | No hay dónde ver un cambio antes de que llegue a producción |
| 4 · Variables del Worker     | El login del CMS no funciona en ningún lado                 |
| 5 · Proyecto de Pages        | Igual que 3                                                 |
| 6 · Directorio y usuario FTP | Igual que 2                                                 |
