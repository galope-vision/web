# 0004 · Machine translation in the CMS, not at build time

- Status: Accepted (setup to validate in phase 1)
- Date: 2026-11-10 · Revised: 2026-11-10 (DeepL → Google Gemini)

## Context

The design has an `ES/EN` switch, and English is in scope. Galope writes in Spanish and wants
the English version to be automatic. There is no budget for paid services or for a translator.

## Decision

Translate **in the CMS**: Sveltia's i18n mode and its built-in machine translation, using the
**Google Gemini free tier** with an API key owned by Galope. The key is stored in the editor's
browser (Sveltia keeps it in local storage), never in the repo. The translated text is saved to
the repo like any other field, and editors can correct it.

Spanish is the default locale, with no URL prefix. English lives under `/en/`. Missing English
falls back to Spanish: the build warns but doesn't fail. UI strings, and the labels of `type`,
`group` and `categories`, live in a code dictionary, translated once by hand.

## Why Gemini

The first version of this ADR chose DeepL. Sveltia [disabled its DeepL
integration](https://github.com/sveltia/sveltia-cms/issues/437) because of an API limitation,
with no date for it to return. Of the services Sveltia supports
([docs](https://sveltiacms.app/en/docs/integrations/translations)), these have a free option:

- **Google Gemini**: free tier, only needs a Google account. On the free tier Google may use
  the inputs to improve its products. That's acceptable here, because everything translated is
  content that gets published anyway. An LLM also tends to read more naturally on creative copy.
- **Google Cloud Translation**: free up to 500,000 characters a month, but it requires a
  billing account with a card.
- **Mistral**: free tier, rate limited.

If the free tier or its terms change, switching is a CMS setting. The content and the code
don't change.

## Alternatives considered

- **Translate at build time** with an API: the build would depend on a third party and need a
  secret in CI. The English text could also change on every build, with no human review.
- **Browser translation widgets**: poor quality, no control over the output, and no SEO for
  `/en/`.
- **Spanish only**: contradicts the design.

## Consequences

- Translation quality depends on the model. Editors should skim the English before publishing.
- The free tier is rate limited, which is plenty for a portfolio of this size.
- Sveltia's header button only fills empty fields. The button on each field overwrites it.
- Galope needs to create the API key once in Google AI Studio and paste it into Sveltia's
  settings.
- To validate in phase 1: the setup in the CMS and which field types it translates.
