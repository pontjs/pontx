/**
 * Tests for Completion Engine
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CompletionEngine,
  createMockDataSource,
  createCompletionInput,
} from "../../src/completion";

describe("CompletionEngine", () => {
  const mockData = {
    specs: ["petstore", "yuque", "github"],
    tags: {
      petstore: ["pet", "store", "user"],
      yuque: ["doc", "repo", "user"],
    },
    apis: {
      "petstore:pet": [
        { name: "addPet", description: "Add a new pet" },
        { name: "getPetById", description: "Get pet by ID" },
        { name: "updatePet", description: "Update pet" },
        { name: "deletePet", description: "Delete pet" },
      ],
      "petstore:store": [
        { name: "getInventory", description: "Get store inventory" },
        { name: "placeOrder", description: "Place an order" },
      ],
      "yuque:doc": [
        { name: "read", description: "Read document" },
        { name: "list", description: "List documents" },
        { name: "create", description: "Create document" },
      ],
    },
    params: {
      "petstore:pet:getPetById": [
        { name: "petId", required: true, type: "integer", description: "Pet ID" },
      ],
      "petstore:pet:addPet": [
        { name: "body", required: true, type: "object", description: "Pet object" },
      ],
      "yuque:doc:read": [
        { name: "id", required: true, type: "string", description: "Document ID" },
        { name: "slug", required: false, type: "string", description: "Document slug" },
      ],
    },
  };

  let engine: CompletionEngine;

  beforeEach(() => {
    engine = new CompletionEngine({}, createMockDataSource(mockData));
  });

  describe("command completion", () => {
    it("should complete commands", async () => {
      const input = createCompletionInput("pontx ", 1);
      const result = await engine.complete(input);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some((s) => s.value === "call")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "search")).toBe(true);
    });

    it("should filter commands by prefix", async () => {
      const input = createCompletionInput("pontx ca", 1);
      const result = await engine.complete(input);

      expect(result.suggestions.every((s) => s.value.startsWith("ca"))).toBe(true);
      expect(result.suggestions.some((s) => s.value === "call")).toBe(true);
    });

    it("should filter commands when specified in options", async () => {
      const limitedEngine = new CompletionEngine(
        { commands: ["call", "search"] },
        createMockDataSource(mockData)
      );

      const input = createCompletionInput("pontx ", 1);
      const result = await limitedEngine.complete(input);

      expect(result.suggestions.length).toBe(2);
      expect(result.suggestions.some((s) => s.value === "call")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "search")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "gen")).toBe(false);
    });
  });

  describe("spec completion", () => {
    it("should complete spec names for call command", async () => {
      const input = createCompletionInput("pontx call ", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.length).toBe(3);
      expect(result.suggestions.some((s) => s.value === "petstore")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "yuque")).toBe(true);
    });

    it("should filter specs by prefix", async () => {
      const input = createCompletionInput("pontx call pet", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.length).toBe(1);
      expect(result.suggestions[0].value).toBe("petstore");
    });

    it("should skip spec completion in proxy mode", async () => {
      const proxyEngine = new CompletionEngine(
        { fixedSpecName: "yuque" },
        createMockDataSource(mockData)
      );

      const input = createCompletionInput("yuque call ", 2);
      const result = await proxyEngine.complete(input);

      // In proxy mode, should complete tags directly
      expect(result.suggestions.some((s) => s.value === "doc")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "petstore")).toBe(false);
    });
  });

  describe("tag completion", () => {
    it("should complete tags after spec name", async () => {
      const input = createCompletionInput("pontx call petstore.", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.length).toBe(3);
      expect(result.suggestions.some((s) => s.value === "petstore.pet")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "petstore.store")).toBe(true);
    });

    it("should filter tags by prefix", async () => {
      const input = createCompletionInput("pontx call petstore.pe", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.length).toBe(1);
      expect(result.suggestions[0].value).toBe("petstore.pet");
    });

    it("should complete tags in proxy mode", async () => {
      const proxyEngine = new CompletionEngine(
        { fixedSpecName: "yuque" },
        createMockDataSource(mockData)
      );

      const input = createCompletionInput("yuque call ", 2);
      const result = await proxyEngine.complete(input);

      expect(result.suggestions.some((s) => s.value === "doc")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "repo")).toBe(true);
    });
  });

  describe("API completion", () => {
    it("should complete APIs after tag", async () => {
      const input = createCompletionInput("pontx call petstore.pet.", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.length).toBe(4);
      expect(result.suggestions.some((s) => s.value === "petstore.pet.addPet")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "petstore.pet.getPetById")).toBe(true);
    });

    it("should filter APIs by prefix", async () => {
      const input = createCompletionInput("pontx call petstore.pet.get", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.length).toBe(1);
      expect(result.suggestions[0].value).toBe("petstore.pet.getPetById");
    });

    it("should complete APIs in proxy mode", async () => {
      const proxyEngine = new CompletionEngine(
        { fixedSpecName: "yuque" },
        createMockDataSource(mockData)
      );

      const input = createCompletionInput("yuque call doc.", 2);
      const result = await proxyEngine.complete(input);

      expect(result.suggestions.some((s) => s.value === "doc.read")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "doc.list")).toBe(true);
    });
  });

  describe("param completion", () => {
    it("should complete params after API path", async () => {
      const input = createCompletionInput("pontx call petstore.pet.getPetById --", 3);
      const result = await engine.complete(input);

      expect(result.suggestions.some((s) => s.value === "--petId")).toBe(true);
    });

    it("should include common CLI options", async () => {
      const input = createCompletionInput("pontx call petstore.pet.getPetById --", 3);
      const result = await engine.complete(input);

      expect(result.suggestions.some((s) => s.value === "--env")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "--debug")).toBe(true);
    });

    it("should filter by prefix", async () => {
      const input = createCompletionInput("pontx call petstore.pet.getPetById --pet", 3);
      const result = await engine.complete(input);

      expect(result.suggestions.some((s) => s.value === "--petId")).toBe(true);
      expect(result.suggestions.some((s) => s.value === "--env")).toBe(false);
    });
  });

  describe("caching", () => {
    it("should cache spec data", async () => {
      // First call
      await engine.getSpecs();
      // Second call should hit cache
      const specs = await engine.getSpecs();

      expect(specs).toEqual(["petstore", "yuque", "github"]);
    });

    it("should cache tag data", async () => {
      const tags1 = await engine.getTags("petstore");
      const tags2 = await engine.getTags("petstore");

      expect(tags1).toEqual(tags2);
      expect(tags1).toEqual(["pet", "store", "user"]);
    });

    it("should invalidate cache", async () => {
      await engine.getSpecs();
      engine.invalidateCache("specs");

      // Cache should be cleared
      const specs = await engine.getSpecs();
      expect(specs).toEqual(["petstore", "yuque", "github"]);
    });
  });

  describe("getCommands", () => {
    it("should return all available commands", () => {
      const commands = engine.getCommands();

      expect(commands).toContain("call");
      expect(commands).toContain("search");
      expect(commands).toContain("show-api");
    });

    it("should respect command filter", () => {
      const limitedEngine = new CompletionEngine(
        { commands: ["call", "search"] },
        createMockDataSource(mockData)
      );

      const commands = limitedEngine.getCommands();

      expect(commands).toEqual(["call", "search"]);
    });
  });

  describe("show-api command", () => {
    it("should complete spec for show-api", async () => {
      const input = createCompletionInput("pontx show-api pet", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.some((s) => s.value === "petstore")).toBe(true);
    });

    it("should complete tag for show-api", async () => {
      const input = createCompletionInput("pontx show-api petstore.", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.some((s) => s.value === "petstore.pet")).toBe(true);
    });
  });

  describe("gen command", () => {
    it("should complete spec for gen", async () => {
      const input = createCompletionInput("pontx gen ", 2);
      const result = await engine.complete(input);

      expect(result.suggestions.some((s) => s.value === "petstore")).toBe(true);
    });
  });
});
