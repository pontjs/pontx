/**
 * Tests for show-schema.ts pure functions
 */

import { describe, it, expect } from "vitest";
import { parseSchemaPath } from "../../src/commands/show-schema";

describe("parseSchemaPath", () => {
  describe("dot-separated format (preferred)", () => {
    it("should parse specName.schemaName", () => {
      const result = parseSchemaPath("petstore.Pet");

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "Pet",
      });
    });

    it("should handle spec names with hyphens", () => {
      const result = parseSchemaPath("my-api.MySchema");

      expect(result).toEqual({
        specName: "my-api",
        schemaName: "MySchema",
      });
    });

    it("should handle quoted schema names with dots", () => {
      const result = parseSchemaPath('petstore."com.example.DTO"');

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "com.example.DTO",
      });
    });

    it("should handle quoted schema names with slashes", () => {
      const result = parseSchemaPath('petstore."User/Response"');

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "User/Response",
      });
    });

    it("should throw error for too many dot-separated parts", () => {
      expect(() => parseSchemaPath("a.b.c")).toThrow(
        "Invalid schema path format"
      );
    });

    it("should throw error for unclosed quote", () => {
      expect(() => parseSchemaPath('petstore."unclosed')).toThrow(
        "Unclosed quote"
      );
    });
  });

  describe("slash-separated format (legacy fallback)", () => {
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

    it("should throw error for path with too many parts", () => {
      expect(() => parseSchemaPath("spec/schemas/Pet")).toThrow(
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
  });

  it("should throw error for path without separator (no singleSpecName)", () => {
    expect(() => parseSchemaPath("petstorePet")).toThrow(
      "Expected: specName.schemaName"
    );
  });

  it("should throw error for empty path", () => {
    expect(() => parseSchemaPath("")).toThrow("Invalid schema path format");
  });

  it("should throw error for path with only spec name (no singleSpecName)", () => {
    expect(() => parseSchemaPath("petstore")).toThrow(
      "Expected: specName.schemaName"
    );
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

    it("should support dot format in single spec mode", () => {
      const result = parseSchemaPath("petstore.Pet", singleSpecName);

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "Pet",
      });
    });

    it("should still support slash format for backward compatibility", () => {
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

    it("should handle quoted schema names in single spec mode", () => {
      const result = parseSchemaPath('petstore."com.example.DTO"', singleSpecName);

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "com.example.DTO",
      });
    });
  });

  describe("multi-spec mode (default behavior)", () => {
    it("should require specName in dot format", () => {
      const result = parseSchemaPath("petstore.Pet");

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "Pet",
      });
    });

    it("should require specName in slash format", () => {
      const result = parseSchemaPath("petstore/Pet");

      expect(result).toEqual({
        specName: "petstore",
        schemaName: "Pet",
      });
    });

    it("should throw error for single part without singleSpecName", () => {
      expect(() => parseSchemaPath("Pet")).toThrow(
        "Expected: specName.schemaName"
      );
    });
  });
});
