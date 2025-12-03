/**
 * Tests for show-api.ts pure functions
 */

import { describe, it, expect } from "vitest";
import { parseApiPath } from "../../src/commands/show-api";

describe("parseApiPath", () => {
  describe("dot-separated format (new format)", () => {
    it("should parse three-part path: specName.tagName.apiName", () => {
      const result = parseApiPath("petstore.pet.getPetById");

      expect(result).toEqual({
        specName: "petstore",
        tagName: "pet",
        apiName: "getPetById",
      });
    });

    it("should parse two-part path: specName.apiName (no tag)", () => {
      const result = parseApiPath("petstore.getPetById");

      expect(result).toEqual({
        specName: "petstore",
        tagName: "",
        apiName: "getPetById",
      });
    });

    it("should handle quoted segments with dots", () => {
      const result = parseApiPath('petstore.pet."get.pet.by.id"');

      expect(result).toEqual({
        specName: "petstore",
        tagName: "pet",
        apiName: "get.pet.by.id",
      });
    });

    it("should handle quoted segments with slashes", () => {
      const result = parseApiPath('petstore."my-tag"."api/name"');

      expect(result).toEqual({
        specName: "petstore",
        tagName: "my-tag",
        apiName: "api/name",
      });
    });

    it("should handle quoted specName", () => {
      const result = parseApiPath('"spec.name".tag.api');

      expect(result).toEqual({
        specName: "spec.name",
        tagName: "tag",
        apiName: "api",
      });
    });

    it("should handle all quoted segments", () => {
      const result = parseApiPath('"spec.v1"."tag.v2"."api.v3"');

      expect(result).toEqual({
        specName: "spec.v1",
        tagName: "tag.v2",
        apiName: "api.v3",
      });
    });

    it("should throw error for unclosed quote", () => {
      expect(() => parseApiPath('petstore."unclosed.tag.api')).toThrow(
        "Unclosed quote"
      );
    });

    it("should throw error for invalid format (only one part)", () => {
      expect(() => parseApiPath("petstore")).toThrow("Invalid API path format");
    });

    it("should throw error for too many parts", () => {
      expect(() => parseApiPath("a.b.c.d")).toThrow("Invalid API path format");
    });
  });

  describe("slash-separated format (legacy format)", () => {
    it("should parse three-part path: specName/tagName/apiName", () => {
      const result = parseApiPath("petstore/pet/getPetById");

      expect(result).toEqual({
        specName: "petstore",
        tagName: "pet",
        apiName: "getPetById",
      });
    });

    it("should parse two-part path: specName/apiName (no tag)", () => {
      const result = parseApiPath("petstore/getPetById");

      expect(result).toEqual({
        specName: "petstore",
        tagName: "",
        apiName: "getPetById",
      });
    });

    it("should throw error for invalid slash format (only one part)", () => {
      expect(() => parseApiPath("petstore-only")).toThrow(
        "Invalid API path format"
      );
    });

    it("should throw error for too many slash parts", () => {
      expect(() => parseApiPath("a/b/c/d")).toThrow("Invalid API path format");
    });
  });

  describe("mixed scenarios", () => {
    it("should prefer dot format when both dot and slash present", () => {
      // "spec.tag/api" has dot, so treated as dot format
      // Parsed as: ["spec", "tag/api"]
      const result = parseApiPath("spec.tag/api");

      expect(result).toEqual({
        specName: "spec",
        tagName: "",
        apiName: "tag/api",
      });
    });

    it("should handle names with hyphens", () => {
      const result = parseApiPath("my-spec.my-tag.my-api");

      expect(result).toEqual({
        specName: "my-spec",
        tagName: "my-tag",
        apiName: "my-api",
      });
    });

    it("should handle numeric names", () => {
      const result = parseApiPath("v1.v2.getVersion");

      expect(result).toEqual({
        specName: "v1",
        tagName: "v2",
        apiName: "getVersion",
      });
    });
  });
});
