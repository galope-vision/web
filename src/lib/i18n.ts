/**
 * Locales, routes and the dictionaries of text that lives in the code.
 *
 * Spanish is the default locale and has no URL prefix. English lives under `/en/` and its path
 * segments are translated too: `/proyectos/111` → `/en/projects/111`. Project content is
 * translated in the CMS (see `src/lib/content.ts` for the Spanish fallback); what is here is
 * the fixed UI text and the labels of the options the CMS stores as keys, both translated once
 * by hand.
 */
import { GROUPS, type Category, type Group, type ProjectType } from './options';

export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'es';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** What the `ES/EN` switch shows for each locale. */
export const LOCALE_LABELS: Record<Locale, string> = { es: 'ES', en: 'EN' };

/* UI strings. Spanish defines the keys; English has to define all of them. */

const ES_UI = {
  'nav.projects': 'PROYECTOS',
  'nav.info': 'INFO',
  'nav.contact': 'CONTACTO',
  'nav.language': 'Idioma',
  'nav.main': 'Navegación principal',
  'page.projects': 'Proyectos',
  'page.info': 'Info',
  'page.contact': 'Contacto',
  'nav.home': 'Inicio',
  'dice.label': 'Ir a un proyecto al azar',
  'project.parts': 'Partes del proyecto',
  'project.photos': 'Fotos',
  'project.videos': 'Vídeos',
  'project.process': 'Proceso',
  'project.credits': 'Créditos',
  'project.moreInfo': 'Más Info',
  'project.lessInfo': 'Menos Info',
  'project.back': 'VOLVER',
  'notFound.title': 'Página no encontrada',
  'notFound.back': 'Ir al inicio',
  'placeholder.soon': 'En construcción.',
  /* The holding page the domain shows until the real home is built (src/components/ComingSoon.astro). */
  'soon.title': 'Próximamente',
  'soon.body': 'Estamos construyendo el nuevo sitio.',
  'soon.follow': 'Mientras tanto',
} as const;

export type UiKey = keyof typeof ES_UI;

const EN_UI: Record<UiKey, string> = {
  'nav.projects': 'PROJECTS',
  'nav.info': 'INFO',
  'nav.contact': 'CONTACT',
  'nav.language': 'Language',
  'nav.main': 'Main navigation',
  'page.projects': 'Projects',
  'page.info': 'Info',
  'page.contact': 'Contact',
  'nav.home': 'Home',
  'dice.label': 'Go to a random project',
  'project.parts': 'Parts of the project',
  'project.photos': 'Photos',
  'project.videos': 'Videos',
  'project.process': 'Process',
  'project.credits': 'Credits',
  'project.moreInfo': 'More Info',
  'project.lessInfo': 'Less Info',
  'project.back': 'BACK',
  'notFound.title': 'Page not found',
  'notFound.back': 'Go to the home page',
  'placeholder.soon': 'Under construction.',
  'soon.title': 'Coming soon',
  'soon.body': 'We are building the new site.',
  'soon.follow': 'In the meantime',
};

const UI: Record<Locale, Record<UiKey, string>> = { es: ES_UI, en: EN_UI };

/** `const s = t(locale)`, then `s('project.back')`. */
export function t(locale: Locale): (key: UiKey) => string {
  return (key) => UI[locale][key];
}

/* Labels of the content options. The keys come from `src/lib/options.ts`. */

/** Groups are years for now, so both locales read the same. */
export const GROUP_LABELS: Record<Locale, Record<Group, string>> = {
  es: Object.fromEntries(GROUPS.map((group) => [group, group])) as Record<Group, string>,
  en: Object.fromEntries(GROUPS.map((group) => [group, group])) as Record<Group, string>,
};

export const TYPE_LABELS: Record<Locale, Record<ProjectType, string>> = {
  es: {
    videoclip: 'Videoclip',
    documental: 'Documental',
    visualizer: 'Visualizer',
    'sesion-en-vivo': 'Sesión en vivo',
    'diseno-grafico': 'Diseño gráfico',
  },
  en: {
    videoclip: 'Music video',
    documental: 'Documentary',
    visualizer: 'Visualizer',
    'sesion-en-vivo': 'Live session',
    'diseno-grafico': 'Graphic design',
  },
};

/** The categories are the same options as the types (`src/lib/options.ts`). */
export const CATEGORY_LABELS: Record<Locale, Record<Category, string>> = TYPE_LABELS;

export function typeLabel(locale: Locale, type: ProjectType): string {
  return TYPE_LABELS[locale][type];
}

export function groupLabel(locale: Locale, group: Group): string {
  return GROUP_LABELS[locale][group];
}

/* Routes. One entry per page, with its segment in each locale. */

const SEGMENTS = {
  projects: { es: 'proyectos', en: 'projects' },
  info: { es: 'info', en: 'info' },
  contact: { es: 'contacto', en: 'contact' },
  styles: { es: 'estilos', en: 'styles' },
} as const satisfies Record<string, Record<Locale, string>>;

export type Page = 'home' | keyof typeof SEGMENTS;

/** `/proyectos/111`, `/en/projects/111`. The home page is the only path with a trailing slash. */
export function localePath(locale: Locale, page: Page, slug?: string): string {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  if (page === 'home') return `${prefix}/`;
  const segment = SEGMENTS[page][locale];
  return slug ? `${prefix}/${segment}/${slug}` : `${prefix}/${segment}`;
}

interface ParsedPath {
  locale: Locale;
  /** `null` when the path is not one of our pages, like a 404. */
  page: Page | null;
  /** What follows the page segment, like a project slug. */
  rest: string[];
}

/** Reads a pathname as locale + page, so a page can link to itself in the other locale. */
export function parsePath(pathname: string): ParsedPath {
  const segments = pathname.split('/').filter(Boolean);
  const [first] = segments;
  const prefixed = first !== undefined && first !== DEFAULT_LOCALE && isLocale(first);
  const locale: Locale = prefixed && first !== undefined ? first : DEFAULT_LOCALE;
  const rest = prefixed ? segments.slice(1) : segments;
  const [head, ...tail] = rest;

  if (head === undefined) return { locale, page: 'home', rest: [] };

  const page = (Object.keys(SEGMENTS) as (keyof typeof SEGMENTS)[]).find(
    (candidate) => SEGMENTS[candidate][locale] === head,
  );
  return page ? { locale, page, rest: tail } : { locale, page: null, rest };
}

/** The locale of the page being rendered, read from its path. */
export function localeOf(pathname: string): Locale {
  return parsePath(pathname).locale;
}

/**
 * The same page in every locale, for the `ES/EN` switch and the `hreflang` links. An unknown
 * path falls back to the home page of each locale.
 */
export function localeVariants(pathname: string): Record<Locale, string> {
  const { page, rest } = parsePath(pathname);
  const variants = LOCALES.map((locale) => [
    locale,
    page ? localePath(locale, page, rest.join('/') || undefined) : localePath(locale, 'home'),
  ]);
  return Object.fromEntries(variants) as Record<Locale, string>;
}
