/**
 * Tests for Completion Providers
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  CommandProvider,
  SpecProvider,
  ApiProvider,
  ParamProvider,
  createCompletionInput,
  parseCompletionContext,
} from "../../src/completion";

describe("CommandProvider", () => {
  let provider: CommandProvider;

  beforeEach(() => {
    provider = new CommandProvider();
  });

  describe("canHandle", () => {
    it("should handle command position", () => {
      const input = createCompletionInput("pontx ", 1);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(true);
    });

    it("should not handle argument position", () => {
      const input = createCompletionInput("pontx call ", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(false);
    });
  });

  describe("provide", () => {
    it("should provide all commands when no prefix", async () => {
      const input = createCompletionInput("pontx ", 1);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.value === "call")).toBe(true);
      expect(suggestions.some((s) => s.value === "search")).toBe(true);
      expect(suggestions.some((s) => s.value === "completion")).toBe(true);
    });

    it("should filter by prefix", async () => {
      const input = createCompletionInput("pontx ca", 1);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.every((s) => s.value.startsWith("ca"))).toBe(true);
    });

    it("should include descriptions", async () => {
      const input = createCompletionInput("pontx call", 1);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      const callSuggestion = suggestions.find((s) => s.value === "call");
      expect(callSuggestion?.description).toBeDefined();
    });
  });

  describe("getCommands", () => {
    it("should return all commands", () => {
      const commands = provider.getCommands();
      expect(commands).toContain("call");
      expect(commands).toContain("search");
      expect(commands).toContain("completion");
    });

    it("should filter commands when specified", () => {
      const limitedProvider = new CommandProvider({ commands: ["call", "search"] });
      const commands = limitedProvider.getCommands();

      expect(commands).toEqual(["call", "search"]);
    });
  });
});

describe("SpecProvider", () => {
  const mockDataSource = {
    getSpecs: async () => ["petstore", "yuque", "github"],
  };

  let provider: SpecProvider;

  beforeEach(() => {
    provider = new SpecProvider({}, mockDataSource);
  });

  describe("canHandle", () => {
    it("should handle spec completion for call command", () => {
      const input = createCompletionInput("pontx call ", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(true);
    });

    it("should handle spec completion for show-api command", () => {
      const input = createCompletionInput("pontx show-api ", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(true);
    });

    it("should not handle when fixedSpecName is set", () => {
      const proxyProvider = new SpecProvider(
        { fixedSpecName: "yuque" },
        mockDataSource
      );
      const input = createCompletionInput("yuque call ", 2);
      const context = parseCompletionContext(input, { fixedSpecName: "yuque" });
      expect(proxyProvider.canHandle(context)).toBe(false);
    });

    it("should not handle tag completion", () => {
      const input = createCompletionInput("pontx call petstore.", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(false);
    });
  });

  describe("provide", () => {
    it("should provide all specs", async () => {
      const input = createCompletionInput("pontx call ", 2);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.length).toBe(3);
      expect(suggestions.map((s) => s.value)).toContain("petstore");
    });

    it("should filter by prefix", async () => {
      const input = createCompletionInput("pontx call pet", 2);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].value).toBe("petstore");
    });
  });
});

describe("ApiProvider", () => {
  const mockDataSource = {
    getTags: async (specName: string) => {
      if (specName === "petstore") return ["pet", "store", "user"];
      if (specName === "yuque") return ["doc", "repo"];
      return [];
    },
    getApis: async (specName: string, tagName?: string) => {
      if (specName === "petstore" && tagName === "pet") {
        return [
          { name: "addPet", description: "Add a pet" },
          { name: "getPetById", description: "Get pet by ID" },
        ];
      }
      return [];
    },
  };

  let provider: ApiProvider;

  beforeEach(() => {
    provider = new ApiProvider({}, mockDataSource);
  });

  describe("canHandle", () => {
    it("should handle tag completion", () => {
      const input = createCompletionInput("pontx call petstore.", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(true);
    });

    it("should handle api completion", () => {
      const input = createCompletionInput("pontx call petstore.pet.", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(true);
    });

    it("should not handle spec completion", () => {
      const input = createCompletionInput("pontx call pet", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(false);
    });
  });

  describe("provide tags", () => {
    it("should provide tags", async () => {
      const input = createCompletionInput("pontx call petstore.", 2);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.length).toBe(3);
      expect(suggestions.some((s) => s.value === "petstore.pet")).toBe(true);
    });

    it("should filter tags by prefix", async () => {
      const input = createCompletionInput("pontx call petstore.pe", 2);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].value).toBe("petstore.pet");
    });

    it("should provide tags without spec prefix in proxy mode", async () => {
      const proxyProvider = new ApiProvider(
        { fixedSpecName: "yuque" },
        mockDataSource
      );
      const input = createCompletionInput("yuque call ", 2);
      const context = parseCompletionContext(input, { fixedSpecName: "yuque" });
      const suggestions = await proxyProvider.provide(context);

      expect(suggestions.some((s) => s.value === "doc")).toBe(true);
      expect(suggestions.some((s) => s.value === "repo")).toBe(true);
    });
  });

  describe("provide APIs", () => {
    it("should provide APIs", async () => {
      const input = createCompletionInput("pontx call petstore.pet.", 2);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.length).toBe(2);
      expect(suggestions.some((s) => s.value === "petstore.pet.addPet")).toBe(true);
    });

    it("should filter APIs by prefix", async () => {
      const input = createCompletionInput("pontx call petstore.pet.get", 2);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.length).toBe(1);
      expect(suggestions[0].value).toBe("petstore.pet.getPetById");
    });
  });
});

describe("ParamProvider", () => {
  const mockDataSource = {
    getParams: async (specName: string, tagName: string, apiName: string) => {
      if (specName === "petstore" && tagName === "pet" && apiName === "getPetById") {
        return [
          { name: "petId", required: true, type: "integer", description: "Pet ID" },
        ];
      }
      return [];
    },
  };

  let provider: ParamProvider;

  beforeEach(() => {
    provider = new ParamProvider({}, mockDataSource);
  });

  describe("canHandle", () => {
    it("should handle option completion for call command", () => {
      const input = createCompletionInput("pontx call petstore.pet.getPetById --", 3);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(true);
    });

    it("should not handle for other commands", () => {
      const input = createCompletionInput("pontx search --", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(false);
    });

    it("should not handle argument position", () => {
      const input = createCompletionInput("pontx call petstore.", 2);
      const context = parseCompletionContext(input);
      expect(provider.canHandle(context)).toBe(false);
    });
  });

  describe("provide", () => {
    it("should provide API params", async () => {
      const input = createCompletionInput("pontx call petstore.pet.getPetById --", 3);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.some((s) => s.value === "--petId")).toBe(true);
    });

    it("should provide common CLI options", async () => {
      const input = createCompletionInput("pontx call petstore.pet.getPetById --", 3);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.some((s) => s.value === "--env")).toBe(true);
      expect(suggestions.some((s) => s.value === "--debug")).toBe(true);
    });

    it("should filter by prefix", async () => {
      const input = createCompletionInput("pontx call petstore.pet.getPetById --pet", 3);
      const context = parseCompletionContext(input);
      const suggestions = await provider.provide(context);

      expect(suggestions.some((s) => s.value === "--petId")).toBe(true);
      expect(suggestions.some((s) => s.value === "--env")).toBe(false);
    });
  });
});
