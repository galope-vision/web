/**
 * Reading content in one locale.
 *
 * Sveltia saves the English version of an entry in its own file (`index.en.md`,
 * `general.en.yml`) with only the translated fields filled in. When a field has no English
 * text yet, the page shows the Spanish one: the build warns and does not fail, so a missing
 * translation never blocks publishing.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { DEFAULT_LOCALE, type Locale } from './i18n';
import type { CollageItem } from './collage';
import { GROUPS, type Group } from './options';

const warned = new Set<string>();

/** The translation when there is one, the Spanish text otherwise. Warns once per field. */
export function fallback<T>(translated: T | null | undefined, spanish: T, field: string): T {
  if (translated !== null && translated !== undefined && translated !== '') return translated;
  if (!warned.has(field)) {
    warned.add(field);
    console.warn(`[i18n] No English for "${field}" yet — showing the Spanish text.`);
  }
  return spanish;
}

type General = CollectionEntry<'general'>['data'];

/** `ajustes/general.yml`: info text, contact details and the SEO defaults. */
export async function getGeneral(locale: Locale): Promise<General> {
  const [entry] = await getCollection('general');
  if (!entry) throw new Error('Missing src/content/ajustes/general.yml');
  const es = entry.data;
  if (locale === DEFAULT_LOCALE) return es;

  const [translation] = await getCollection('generalEn');
  const en = translation?.data;

  return {
    ...es,
    info: {
      text: fallback(en?.info?.text, es.info.text, 'general.info.text'),
      highlights: es.info.highlights.map((highlight, index) => {
        const translated = en?.info?.highlights[index];
        const field = `general.info.highlights[${index}]`;
        return {
          ...highlight,
          phrase: fallback(translated?.phrase, highlight.phrase, `${field}.phrase`),
          alt: fallback(translated?.alt, highlight.alt, `${field}.alt`),
        };
      }),
    },
    seo: {
      title: fallback(en?.seo?.title, es.seo.title, 'general.seo.title'),
      description: fallback(en?.seo?.description, es.seo.description, 'general.seo.description'),
    },
  };
}

/* Projects. */

type ProjectEntry = CollectionEntry<'proyectos'>;
type ProjectTranslation = CollectionEntry<'proyectosEn'>['data'];
export type ProjectData = ProjectEntry['data'];

export interface Project {
  /** The folder under `src/content/proyectos`, which is also the URL slug. */
  slug: string;
  data: ProjectData;
}

/**
 * One of the Fotos / Vídeos / Proceso parts of a project, as the panel links to it. `id` is the
 * id of the section further down the page, so the link and the section cannot drift apart.
 */
export interface ProjectPart {
  id: 'fotos' | 'videos' | 'proceso';
  label: string;
}

/** A group and the projects in it, as the list renders them (docs/spec.md § 5.2). */
export interface ProjectGroup {
  group: Group;
  projects: Project[];
}

/** The translated fields of a project; everything else is the Spanish entry as it stands. */
function translate(entry: ProjectEntry, en: ProjectTranslation | undefined): ProjectData {
  const es = entry.data;
  const field = (name: string): string => `proyectos/${entry.id}.${name}`;

  return {
    ...es,
    quote: es.quote === undefined ? undefined : fallback(en?.quote, es.quote, field('quote')),
    description: fallback(en?.description, es.description, field('description')),
    credits: es.credits.map((credit, index) => ({
      ...credit,
      role: fallback(en?.credits?.[index]?.role, credit.role, field(`credits[${index}].role`)),
    })),
    gallery: es.gallery.map((item, index) => ({
      ...item,
      alt: fallback(en?.gallery?.[index]?.alt, item.alt, field(`gallery[${index}].alt`)),
    })),
  };
}

/**
 * Every project with `visible: true`, in one locale, sorted by `order`.
 *
 * The English entry lives in its own file and is matched by slug, not by position: the loader
 * ids are `<slug>` for Spanish and `<slug>/en` for English.
 */
export async function getProjects(locale: Locale): Promise<Project[]> {
  const entries = await getCollection('proyectos');
  const translations = locale === DEFAULT_LOCALE ? [] : await getCollection('proyectosEn');
  const bySlug = new Map(translations.map((entry) => [entry.id.replace(/\/en$/, ''), entry.data]));

  return entries
    .filter((entry) => entry.data.visible)
    .map((entry) => ({
      slug: entry.id,
      data: locale === DEFAULT_LOCALE ? entry.data : translate(entry, bySlug.get(entry.id)),
    }))
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/**
 * Projects split into groups. The groups come out in the order their options are declared in
 * `src/lib/options.ts`, which is the order the CMS shows them in — what the spec asks for.
 * A group with no visible project is left out rather than rendered empty.
 */
export function groupProjects(projects: Project[]): ProjectGroup[] {
  return GROUPS.map((group) => ({
    group,
    projects: projects.filter((project) => project.data.group === group),
  })).filter(({ projects: inGroup }) => inGroup.length > 0);
}

/**
 * A description cut to fit a `<meta name="description">`. A project description is allowed up
 * to `DESCRIPTION_MAX` characters, which is far longer than a search result shows, so the page
 * trims it on a word boundary rather than letting the engine cut it mid-word.
 */
export function excerpt(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:—-]$/, '')}…`;
}

/**
 * The images a project puts in its collage: the gallery, in order, and the cover when there is
 * no gallery yet, so a project still has something behind its name.
 *
 * They carry no alt text. On a project page every one of them is listed again in the sections
 * below with its real alt; on the list, the names of the projects are the text and the collage
 * is the backdrop. Either way a screen reader should meet each photograph once at most.
 */
export function collageItems(project: Project): CollageItem[] {
  const { gallery, cover } = project.data;
  if (gallery.length > 0) {
    return gallery.map(({ image, focus }) => ({ image, alt: '', focus }));
  }
  return [{ image: cover, alt: '', focus: 'center' }];
}

/** The slug plus `collageSeed`: the same project always gets the same arrangement. */
export function collageSeed(project: Project): string {
  return `${project.slug}-${project.data.collageSeed}`;
}
