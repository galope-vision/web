// @ts-check
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        // Reserved for commits made by Sveltia CMS.
        'content',
      ],
    ],
    'header-max-length': [2, 'always', 72],
  },
};
