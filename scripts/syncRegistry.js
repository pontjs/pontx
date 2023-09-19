const child_process = require("child_process");

const packages = [
  "jsonschema-form",
  "pontx-cli",
  "pontx-manager",
  "pontx-generate",
  "pontx-spec",
  "pontx-spec-diff",
  "pontx-ui",
  "oas-spec-ts",
  "pontx-meta-fetch-plugin",
  "pontx-generate-core",
  "pontx-mocks-plugin",
  "pontx-react-hooks-generate-plugin",
  "pontx-oas2-parser-plugin",
  "pontx-oas3-parser-plugin",
];

const hostname = process.argv[2] || "https://npmmirror.com";

child_process.execSync(packages.map((name) => `open ${hostname}/sync/${name}`).join(" && "));
