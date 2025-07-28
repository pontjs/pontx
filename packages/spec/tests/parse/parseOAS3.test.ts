import { describe, it, expect } from "vitest";
import { parseOAS3 } from "../../src/parse/parseOAS3";
import * as YAML from "js-yaml";
import * as fs from "fs";
import path from "path";

const yamlPath = path.join(__dirname, "../oas3/openapi.yaml");

const oas3 = YAML.load(fs.readFileSync(yamlPath, "utf-8"));

describe("parseOAS3", () => {
  it("should parse OAS3", () => {
    const spec = parseOAS3(oas3, "test");
    expect(spec).toBeDefined();
  });
});