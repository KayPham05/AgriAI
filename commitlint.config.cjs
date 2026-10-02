// Keep these rules aligned with .agents/rules/project_rules.md, section 2.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  defaultIgnores: false,
  plugins: [
    {
      rules: {
        'jira-subject': ({ subject }) => [
          /^AGRI-\d+ \S/.test(subject ?? ''),
          'description must start with an uppercase AGRI-<number> key followed by a summary',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [2, 'always', [
      'feat', 'fix', 'refactor', 'docs', 'test', 'chore',
      'experiment', 'style', 'perf', 'build', 'ci', 'revert',
    ]],
    'jira-subject': [2, 'always'],
    // Jira keys, model names and Vietnamese text must retain their casing.
    'subject-case': [0],
    'scope-case': [0],
    'subject-full-stop': [0],
    // The project recommends short subjects when practical, rather than a hard limit.
    'header-max-length': [1, 'always', 72],
    'body-max-line-length': [0],
    'footer-max-line-length': [0],
  },
};
