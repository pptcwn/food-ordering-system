/**
 * Isolated authorization-suite configuration. This deliberately targets only
 * authz tests so it cannot run the legacy live-mutation smoke script.
 */
module.exports = {
  displayName: 'isolated-api-authz',
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/authz/**/*.spec.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testTimeout: 20000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
