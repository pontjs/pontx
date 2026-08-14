import { describe, expect, it } from "vitest";
import { generateSchemaCode } from "../../src/generate/typescript/schema";

describe("TypeScript schema generation", () => {
  it("represents OpenAPI binary payloads as Blob values", () => {
    expect(generateSchemaCode({ type: "string", format: "binary" })).toBe("Blob");
  });
});
