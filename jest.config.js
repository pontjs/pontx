module.exports = {
  transform: {
    ".(ts|tsx)": "ts-jest",
  },
  globals: {},
  coverageDirectory: "coverage",
  coverageReporters: ["html", "lcov", "text"],
  collectCoverageFrom: ["packages/*/src/**/*.ts", "plugins/*/src/**/*.ts"],
  watchPathIgnorePatterns: ["/node_modules/"],
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  moduleNameMapper: {},
  rootDir: __dirname,
  testMatch: ["<rootDir>/packages/**/tests/**/*spec.[jt]s?(x)", "<rootDir>/plugins/**/tests/**/*spec.[jt]s?(x)"],
};
