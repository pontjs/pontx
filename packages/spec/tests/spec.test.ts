import { describe, it, expect } from "vitest";
import { PontxSpec, PontxSpecs } from "../src/spec";
import { PontxAPI } from "../src/api";

describe("PontxSpec", () => {
  describe("reOrder", () => {
    it("should reorder fields alphabetically", () => {
      const spec = {
        name: "test",
        apis: {},
        components: { schemas: {} },
        tags: [],
        info: { title: "Test API" },
      } as PontxSpec;

      const reordered = PontxSpec.reOrder(spec);
      expect(Object.keys(reordered)).toEqual([
        "apis",
        "components",
        "info",
        "name",
        "tags",
      ]);
    });
  });

  describe("checkHasMods", () => {
    it("should return false for empty spec", () => {
      const spec = new PontxSpec();
      spec.name = "test";
      expect(PontxSpec.checkHasMods(spec)).toBe(false);
    });

    it("should return true when API names contain namespace", () => {
      const spec = {
        name: "test",
        apis: {
          "namespace/api1": {} as PontxAPI,
        },
      } as PontxSpec;
      expect(PontxSpec.checkHasMods(spec)).toBe(true);
    });

    it("should return false when API names don't contain namespace", () => {
      const spec = {
        name: "test",
        apis: {
          api1: {} as PontxAPI,
        },
      } as PontxSpec;
      expect(PontxSpec.checkHasMods(spec)).toBe(false);
    });
  });

  describe("getNamespaceNames", () => {
    it("should return empty array for no namespaces", () => {
      const spec = {
        name: "test",
        apis: {
          api1: {} as PontxAPI,
        },
      } as PontxSpec;
      expect(PontxSpec.getNamespaceNames(spec)).toEqual([]);
    });

    it("should return unique namespace names", () => {
      const spec = {
        name: "test",
        apis: {
          "ns1/api1": {} as PontxAPI,
          "ns1/api2": {} as PontxAPI,
          "ns2/api3": {} as PontxAPI,
        },
      } as PontxSpec;
      expect(PontxSpec.getNamespaceNames(spec)).toEqual(["ns1", "ns2"]);
    });
  });

  describe("addApi", () => {
    it("should add new API to spec", () => {
      const spec = new PontxSpec();
      spec.name = "test";
      const apiName = "test/api";
      const apiSpec = {} as PontxAPI;

      const newSpec = PontxSpec.addApi(spec, apiName, apiSpec);
      expect(newSpec.apis[apiName]).toBe(apiSpec);
    });
  });

  describe("removeApi", () => {
    it("should remove API from spec", () => {
      const spec = {
        name: "test",
        apis: {
          "test/api": {} as PontxAPI,
        },
      } as PontxSpec;

      const newSpec = PontxSpec.removeApi(spec, "test/api");
      expect(newSpec.apis["test/api"]).toBeUndefined();
    });
  });

  describe("reNameApi", () => {
    it("should rename API in spec", () => {
      const spec = {
        name: "test",
        apis: {
          "old/name": { description: "test" } as PontxAPI,
        },
      } as PontxSpec;

      const newSpec = PontxSpec.reNameApi(spec, "old/name", "new/name");
      expect(newSpec.apis["old/name"]).toBeUndefined();
      expect(newSpec.apis["new/name"].description).toBe("test");
    });
  });

  describe("getMeta", () => {
    it("should get API meta", () => {
      const spec = {
        name: "test",
        apis: {
          "test/api": { description: "test" } as PontxAPI,
        },
      } as PontxSpec;

      const meta = PontxSpec.getMeta(spec, "api", "test/api");
      expect(meta.description).toBe("test");
    });

    it("should get struct meta", () => {
      const spec = {
        name: "test",
        apis: {},
        components: {
          schemas: {
            TestStruct: { type: "object" },
          },
        },
      } as PontxSpec;

      const meta = PontxSpec.getMeta(spec, "struct", "TestStruct");
      expect(meta.type).toBe("object");
    });

    it("should get tag meta", () => {
      const spec = {
        name: "test",
        apis: {},
        tags: [{ name: "test", description: "test tag" }],
      } as PontxSpec;

      const meta = PontxSpec.getMeta(spec, "tag", "test");
      expect(meta.description).toBe("test tag");
    });
  });
});

describe("PontxSpecs", () => {
  describe("updateSpec", () => {
    it("should add new spec to empty array", () => {
      const specs: PontxSpec[] = [];
      const newSpec = { name: "test", apis: {} } as PontxSpec;

      const updated = PontxSpecs.updateSpec(specs, "test", newSpec);
      expect(updated).toHaveLength(1);
      expect(updated[0].name).toBe("test");
    });

    it("should update existing spec", () => {
      const specs = [
        { name: "test", apis: {} },
        { name: "test2", apis: {} },
      ] as PontxSpec[];

      const newSpec = {
        name: "test",
        apis: {
          "test/api": {
            path: "/test",
            method: "GET",
            responses: {},
          } as PontxAPI,
        },
      } as PontxSpec;

      const updated = PontxSpecs.updateSpec(specs, "test", newSpec);
      expect(updated[0].apis["test/api"]).toBeDefined();
    });
  });

  describe("checkIsSingleSpec", () => {
    it("should return true for single unnamed spec", () => {
      const specs = [{ name: "", apis: {} }] as PontxSpec[];
      expect(PontxSpecs.checkIsSingleSpec(specs)).toBe(true);
    });

    it("should return false for multiple specs", () => {
      const specs = [
        { name: "test1", apis: {} },
        { name: "test2", apis: {} },
      ] as PontxSpec[];
      expect(PontxSpecs.checkIsSingleSpec(specs)).toBe(false);
    });
  });

  describe("getSpecByName", () => {
    it("should return spec by name", () => {
      const specs = [
        { name: "test1", apis: {} },
        { name: "test2", apis: {} },
      ] as PontxSpec[];

      const spec = PontxSpecs.getSpecByName(specs, "test1");
      expect(spec.name).toBe("test1");
    });

    it("should return first spec if name not found", () => {
      const specs = [
        { name: "test1", apis: {} },
        { name: "test2", apis: {} },
      ] as PontxSpec[];

      const spec = PontxSpecs.getSpecByName(specs, "notfound");
      expect(spec.name).toBe("test1");
    });
  });
});
