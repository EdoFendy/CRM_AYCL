module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: ['./tsconfig.json'],
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: ['plugin:@typescript-eslint/recommended', 'plugin:import/typescript', 'prettier'],
  root: true,
  env: {
    node: true,
    jest: true
  },
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'import/no-default-export': 'error'
  }
};
// CRITIC PASS: Regole lint iniziali senza personalizzazioni per architettura esagonale o layer boundaries; TODO integrare lint staged e configurazioni più restrittive su import ciclici.
