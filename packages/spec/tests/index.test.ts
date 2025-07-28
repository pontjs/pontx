import { test, expect } from "vitest";
import { parseOAS3 } from "../src/index";
import * as fse from "fs-extra";
import * as path from "path";
import * as YAML from "js-yaml";

const swaggerPath = path.join(__dirname, "./yamls/openapi.yaml");
const swaggerYaml = fse.readFileSync(swaggerPath, "utf-8");
const swagger = YAML.load(swaggerYaml);

test("parseOAS3", () => {
  const spec = parseOAS3(swagger, "api-meta-v2");
  expect(spec).toBeDefined();
});
