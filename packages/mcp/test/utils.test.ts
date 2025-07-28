import { describe, it, expect, vi } from "vitest";
import { promises as fsp } from "fs";
import Fuse from "fuse.js";
import {
  buildFuse,
  searchApis,
  getApiMeta,
  makeCode,
  callTool,
  buildPontxManager,
} from "../src/utils";
import pontx, { PontxManager } from "pontx/lib";
import * as path from "path";

describe("Utils", async () => {
  const reactAppProjPath = path.join(__dirname, "../../../examples/react-app");
  const mockPontxManagerConfig = {
    rootDir: reactAppProjPath,
    configDir: reactAppProjPath,
    outDir: path.join(reactAppProjPath, "src/services"),
    origins: [
      {
        url: "https://petstore.swagger.io/v2/swagger.json",
        name: "petstore",
      },
    ],
  };
  const mockPontxManager = await PontxManager.constructorFromPontxConfig(
    mockPontxManagerConfig
  );

  const fuse = buildFuse(mockPontxManager as any);

  describe("buildFuse", () => {
    it("should build Fuse instance with correct data structure", () => {
      expect(fuse).toBeInstanceOf(Fuse);
    });
  });

  describe("searchApis", () => {
    it("should return correct search results", () => {
      const results = searchApis("list pets", fuse);
      expect(results?.[0]?.api).toContain("findPets");
    });
  });

  describe("getApiMeta", () => {
    it("should return correct API metadata", () => {
      const apiMeta = getApiMeta(
        mockPontxManager as any,
        "petstore",
        "pet",
        "findPetsByStatus"
      );

      expect(apiMeta?.parameters?.[0]?.name).toEqual("status");
    });

    it("should throw error when origin not found", () => {
      expect(() => {
        getApiMeta(mockPontxManager as any, "petstore", "pet", "testApi");
      }).toThrow("找不到 API");
    });
  });

  describe("makeCode", () => {
    it("should generate request code correctly", () => {
      const params = { status: "available" };
      const code = makeCode(
        mockPontxManager as any,
        "petstore",
        "pet",
        "findPetsByStatus",
        params,
        {},
        "request"
      );

      expect(code).toContain(
        "pontxClient.petstore.pet.findPetsByStatus.request"
      );
    });

    it("should generate get code correctly", () => {
      const params = { status: "available" };

      const code = makeCode(
        mockPontxManager as any,
        "petstore",
        "pet",
        "getPets",
        params,
        {},
        "reactHooks"
      );

      expect(code).toContain(
        "useQuery(pontxClient.petstore.pet.getPets.queryOptions"
      );
      expect(code).toContain('status: "available"');
    });
  });
});
