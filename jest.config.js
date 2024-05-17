/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */
/*eslint-env node*/

module.exports = {
  // Automatically clear mock calls and instances between every test
  clearMocks: true,

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  coverageThreshold: {
    global: {
      lines: 100
    },
    "./src/index.ts": {
      lines: 50 // coverage is not accurate for index.ts, even though all lines are tested...
    }
  },

  // An array of file extensions your modules use
  moduleFileExtensions: ["ts", "js", "json", "node"],
  
  // A preset that is used as a base for Jest's configuration
  preset: "ts-jest",

  // The test environment that will be used for testing
  testEnvironment: "node",

  // The glob patterns Jest uses to detect test files
  testMatch: ["**/__tests__/?(*.)+(spec|test).ts"],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: ["/node_modules/", ".d.ts", ".js"],
};
