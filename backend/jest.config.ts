import type { Config } from 'jest';

const config: Config = {
  rootDir: '.',
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@prisma/(.*)$': '<rootDir>/src/prisma/$1'
  },
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }]
  },
  coverageDirectory: '../coverage/backend',
  testEnvironment: 'node',
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  setupFilesAfterEnv: [],
  verbose: true
};

export default config;
// CRITIC PASS: Configurazione Jest baseline senza mock Prisma o setup test container; TODO aggiungere global setup per database in memoria e coverage thresholds.
