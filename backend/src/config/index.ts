export { configuration } from './configuration';
export type { AppConfiguration } from './configuration';
export { environmentSchema, validateEnvironment } from './env.validation';
export type { EnvironmentVariables } from './env.validation';
// CRITIC PASS: Barrel file minimale; TODO valutare esportazione di config modulari (es. storageConfig) per riuso esplicito nei moduli tematici.
