# 0004 · Machine translation in the CMS, not at build time

- Status: Accepted (setup to validate in phase 1)
- Date: 2026-11-10

## Context

The design has an `ES/EN` switch, and English is in scope. Galope writes in Spanish and wants
the English version to be automatic. There is no budget for paid services or for a translator.

## Decision

Translate **in the CMS**: Sveltia's i18n mode and its machine translation with a **DeepL API
Free** key owned by Galope. The key is stored in the editor's browser, never in the repo. The
translated text is saved to the repo like any other field, and editors can correct it.

Spanish is the default locale, with no URL prefix. English lives under `/en/`. Missing English
falls back to Spanish: the build warns but doesn't fail. UI strings live in a code dictionary,
translated once by hand.

## Alternatives considered

- **Translate at build time** with an API: the build would depend on a third party and need a
  secret in CI. The English text could also change on every build, with no human review.
- **Browser translation widgets**: poor quality, no control over the output, and no SEO for
  `/en/`.
- **Spanish only**: contradicts the design.

## Consequences

- Translation quality depends on DeepL. Editors should skim the English before publishing.
- The free tier has a monthly character quota. It's far above what a portfolio of this size
  needs, and it costs nothing.
- To validate in phase 1: how Sveltia configures the DeepL key and which fields it translates.
