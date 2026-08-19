module.exports = {
  displayName: 'api-tests',
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.spec.ts', '<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/test/authz/'], // authz has its own suite
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  moduleFileExtensions: ['js', 'json', 'ts'],
  testTimeout: 20000,
  verbose: true,
  clearMocks: true,
  restoreMocks: true,
};
