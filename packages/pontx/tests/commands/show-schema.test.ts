/**
 * Tests for show-schema.ts pure functions
 */

import { describe, it, expect } from "vitest";
import { parseSchemaPath } from "../../src/commands/show-schema";

describe("parseSchemaPath", () => {
  it("should parse valid schema path: specName/schemaName", () => {
    const result = parseSchemaPath("petstore/Pet");

    expect(result).toEqual({
      specName: "petstore",
      schemaName: "Pet",
    });
  });

  it("should handle complex schema names", () => {
    const result = parseSchemaPath("myapi/UserResponse");

    expect(result).toEqual({
      specName: "myapi",
      schemaName: "UserResponse",
    });
  });

  it("should handle spec names with hyphens", () => {
    const result = parseSchemaPath("my-api/MySchema");

    expect(result).toEqual({
      specName: "my-api",
      schemaName: "MySchema",
    });
  });

  it("should handle schema names with special characters", () => {
    const result = parseSchemaPath("api/User_Response_DTO");

    expect(result).toEqual({
      specName: "api",
      schemaName: "User_Response_DTO",
    });
  });

  it("should throw error for path without slash", () => {
    expect(() => parseSchemaPath("petstorePet")).toThrow(
      "Invalid schema path format"
    );
  });

  it("should throw error for path with too many parts", () => {
    expect(() => parseSchemaPath("spec/schemas/Pet")).toThrow(
      "Invalid schema path format"
    );
  });

  it("should throw error for empty path", () => {
    expect(() => parseSchemaPath("")).toThrow("Invalid schema path format");
  });

  it("should throw error for path with only spec name", () => {
    expect(() => parseSchemaPath("petstore")).toThrow(
      "Invalid schema path format"
    );
  });

  it("should handle numeric schema names", () => {
    const result = parseSchemaPath("api/V2Response");

    expect(result).toEqual({
      specName: "api",
      schemaName: "V2Response",
    });
  });

  it("should handle schema name starting with lowercase", () => {
    const result = parseSchemaPath("api/petResponse");

    expect(result).toEqual({
      specName: "api",
      schemaName: "petResponse",
    });
  });

  describe("single spec mode", () => {
    const singleSpecName = "petstore";

    it("should parse schema name directly in single spec mode", () => {
      const result = parseSchemaPath("Pet", singleSpecName);

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "Pet",
      });
    });

    it("should still support full format for backward compatibility", () => {
      const result = parseSchemaPath("petstore/Pet", singleSpecName);

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "Pet",
      });
    });

    it("should handle complex schema names in single spec mode", () => {
      const result = parseSchemaPath("UserResponse_DTO", singleSpecName);

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "UserResponse_DTO",
      });
    });
  });

  describe("multi-spec mode (default behavior)", () => {
    it("should require specName in standard format", () => {
      const result = parseSchemaPath("petstore/Pet");

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "Pet",
      });
    });

    it("should throw error for single part without singleSpecName", () => {
      expect(() => parseSchemaPath("Pet")).toThrow(
        "Invalid schema path format"
      );
    });
  });
});
