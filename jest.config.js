/** @type {import('ts-jest').JestConfigWithTsJest} */
const tsJest = "ts-jest";
const transform = {
  "^.+\\.tsx?$": "ts-jest",
  "\\.ya?ml$": "<rootDir>/src/test-utils/yamlTransform.js",
  "^.+\\.ttf$": "<rootDir>/src/test-utils/ttfTransform.js",
};
module.exports = {
  projects: [
    {
      displayName: "node",
      preset: tsJest,
      testEnvironment: "node",
      testMatch: ["**/?(*.)+(test).ts?(x)"],
      testPathIgnorePatterns: ["/node_modules/", "\\.dom\\.test\\.tsx?$"],
      transform,
    },
    {
      displayName: "dom",
      preset: tsJest,
      testEnvironment: "jsdom",
      testMatch: ["**/?(*.)+(dom.test).ts?(x)"],
      setupFilesAfterEnv: ["<rootDir>/jest.setup.dom.ts"],
      moduleNameMapper: {
        "\\.(scss|sass|css)$": "<rootDir>/src/test-utils/cssStub.ts",
        "^react-markdown$": "<rootDir>/src/test-utils/reactMarkdownStub.tsx",
      },
      transform,
    },
  ],
};
