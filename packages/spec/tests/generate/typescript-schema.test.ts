import { describe, expect, it } from "vitest";
import { generateSchemaCode, generateSchemas } from "../../src/generate/typescript/schema";

describe("TypeScript schema generation", () => {
  it("represents OpenAPI binary payloads as Blob values", () => {
    expect(generateSchemaCode({ type: "string", format: "binary" })).toBe("Blob");
  });

  it("does not qualify references to schemas declared in the same output module", () => {
    const code = generateSchemas({
      components: {
        schemas: {
          Currency: {
            type: "object",
            properties: { code: { type: "string" } },
          },
          CurrencyMap: {
            type: "object",
            additionalProperties: { $ref: "#/components/schemas/Currency" },
          },
        },
      },
    } as any);

    expect(code).toContain("Record<any, Currency>");
    expect(code).not.toContain("schemas.Currency");
  });
});
