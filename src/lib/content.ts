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
