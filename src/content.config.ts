/**
 * Content collections. Every CMS field (public/admin/config.yml, phase 1) must have a matching
 * rule here, so bad content fails the build and the preview, never production.
 *
 * i18n layout (Sveltia `multiple_files`, default locale omitted from the file name):
 *   proyectos/<slug>/index.md      Spanish (default), full entry
 *   proyectos/<slug>/index.en.md   English: translated fields, plus copies of the rest
 *   ajustes/<name>.yml / <name>.en.yml
 * Non-translated fields use `i18n: duplicate` in the CMS, so the English file repeats them.
 * The English schemas only validate the translated fields and ignore the rest.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

import { CATEGORIES, DESCRIPTION_MAX, FOCUS, GALLERY_PARTS, GROUPS, TYPES } from './lib/options';

const VIDEO_URL =
  /^https:\/\/(?:(?:www\.)?youtube\.com\/(?:watch\?v=|embed\/|shorts\/)[\w-]{11}|youtu\.be\/[\w-]{11}|(?:www\.)?vimeo\.com\/\d+|player\.vimeo\.com\/video\/\d+)(?:[?&#].*)?$/;

const text = z.string().trim().min(1);
const videoUrl = z.string().regex(VIDEO_URL, 'Must be a YouTube or Vimeo video URL');

/** Keeps the path without extension as the id: `111-documental/index.en` → `111-documental/en`. */
function localizedId({ entry }: { entry: string }): string {
  const [path = entry, locale] = entry
    .replace(/\.(md|ya?ml)$/, '')
    .replace(/\/index(?=\.|$)/, '')
    .split('.');
  return locale ? `${path}/${locale}` : path;
}

const proyectos = defineCollection({
  loader: glob({
    base: './src/content/proyectos',
    pattern: ['*/index.md'],
    generateId: localizedId,
  }),
  schema: ({ image }) =>
    z.object({
      title: text,
      group: z.enum(GROUPS),
      type: z.enum(TYPES),
      categories: z.array(z.enum(CATEGORIES)).default([]),
      quote: text.optional(),
      description: text.max(DESCRIPTION_MAX),
      credits: z.array(z.object({ role: text, name: text, url: z.url().optional() })).default([]),
      cover: image(),
      gallery: z
        .array(
          z.object({
            image: image(),
            part: z.enum(GALLERY_PARTS),
            focus: z.enum(FOCUS).default('center'),
            alt: text,
          }),
        )
        .default([]),
      videos: z.array(videoUrl).default([]),
      collageSeed: z.number().int().nonnegative().default(0),
      order: z.number().int(),
      inDice: z.boolean().default(true),
      visible: z.boolean().default(true),
      date: z.coerce.date(),
    }),
});

/** English translations. Items are matched to the Spanish entry by position. */
const proyectosEn = defineCollection({
  loader: glob({
    base: './src/content/proyectos',
    pattern: ['*/index.en.md'],
    generateId: localizedId,
  }),
  schema: z.looseObject({
    quote: text.optional(),
    description: text.max(DESCRIPTION_MAX).optional(),
    credits: z.array(z.looseObject({ role: text.optional() })).optional(),
    gallery: z.array(z.looseObject({ alt: text.optional() })).optional(),
  }),
});

/** Info text with highlighted phrases; each phrase must appear in the text. */
function infoSchema<T extends z.ZodType>(highlightImage: T) {
  return z
    .object({
      text,
      highlights: z.array(z.object({ phrase: text, image: highlightImage, alt: text })),
    })
    .superRefine(({ text: body, highlights }, ctx) => {
      highlights.forEach(({ phrase }, index) => {
        if (!body.includes(phrase)) {
          ctx.addIssue({
            code: 'custom',
            path: ['highlights', index, 'phrase'],
            message: `"${phrase}" does not appear in the info text`,
          });
        }
      });
    });
}

/** One collection per settings file; `name` is the file name without extension. */
function settingsLoader(name: string, locale?: 'en') {
  return glob({
    base: './src/content/ajustes',
    pattern: locale ? `${name}.${locale}.yml` : `${name}.yml`,
    generateId: localizedId,
  });
}

const general = defineCollection({
  loader: settingsLoader('general'),
  schema: ({ image }) =>
    z.object({
      info: infoSchema(image()),
      email: z.email(),
      socials: z.array(z.object({ label: text, url: z.url() })).default([]),
      seo: z.object({ title: text, description: text.max(160) }),
      shareImage: image(),
    }),
});

const generalEn = defineCollection({
  loader: settingsLoader('general', 'en'),
  schema: z.looseObject({
    info: infoSchema(z.unknown()).optional(),
    seo: z
      .looseObject({ title: text.optional(), description: text.max(160).optional() })
      .optional(),
  }),
});

const home = defineCollection({
  loader: settingsLoader('home'),
  schema: ({ image }) =>
    z.object({
      images: z.array(z.object({ image: image(), alt: text })).min(1),
      featuredVideo: videoUrl.optional(),
    }),
});

const homeEn = defineCollection({
  loader: settingsLoader('home', 'en'),
  schema: z.looseObject({
    images: z.array(z.looseObject({ alt: text.optional() })).optional(),
  }),
});

export const collections = { proyectos, proyectosEn, general, generalEn, home, homeEn };
