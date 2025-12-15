/**
 * Tests for Completion Context Parser
 */

import { describe, it, expect } from "vitest";
import {
  parsePartialApiPath,
  parseCompletionContext,
  createCompletionInput,
  optionNeedsValue,
  isBooleanOption,
  parseDotSeparatedPath,
  parseWordsToOptionsAndArgs,
} from "../../src/completion/context";

describe("parseDotSeparatedPath", () => {
  it("should return empty array for empty string", () => {
    expect(parseDotSeparatedPath("")).toEqual([]);
  });

  it("should parse single segment", () => {
    expect(parseDotSeparatedPath("petstore")).toEqual(["petstore"]);
  });

  it("should parse two segments", () => {
    expect(parseDotSeparatedPath("petstore.pet")).toEqual(["petstore", "pet"]);
  });

  it("should parse three segments", () => {
    expect(parseDotSeparatedPath("petstore.pet.getPetById")).toEqual([
      "petstore",
      "pet",
      "getPetById",
    ]);
  });

  it("should handle trailing dot", () => {
    expect(parseDotSeparatedPath("petstore.")).toEqual(["petstore", ""]);
  });
});

describe("parsePartialApiPath", () => {
  describe("standard mode (no fixedSpecName)", () => {
    it('should parse empty string as completing spec', () => {
      const result = parsePartialApiPath("");
      expect(result).toEqual({
        partial: "",
        completing: "spec",
      });
    });

    it('should parse "pet" as completing spec', () => {
      const result = parsePartialApiPath("pet");
      expect(result).toEqual({
        partial: "pet",
        completing: "spec",
      });
    });

    it('should parse "petstore." as completing tag', () => {
      const result = parsePartialApiPath("petstore.");
      expect(result).toEqual({
        specName: "petstore",
        partial: "",
        completing: "tag",
      });
    });

    it('should parse "petstore.pet" as completing tag (partial)', () => {
      const result = parsePartialApiPath("petstore.pet");
      expect(result).toEqual({
        specName: "petstore",
        partial: "pet",
        completing: "tag",
      });
    });

    it('should parse "petstore.pet." as completing api', () => {
      const result = parsePartialApiPath("petstore.pet.");
      expect(result).toEqual({
        specName: "petstore",
        tagName: "pet",
        partial: "",
        completing: "api",
      });
    });

    it('should parse "petstore.pet.get" as completing api (partial)', () => {
      const result = parsePartialApiPath("petstore.pet.get");
      expect(result).toEqual({
        specName: "petstore",
        tagName: "pet",
        partial: "get",
        completing: "api",
      });
    });

    it('should parse "petstore.pet.getPetById" as completing api', () => {
      const result = parsePartialApiPath("petstore.pet.getPetById");
      expect(result).toEqual({
        specName: "petstore",
        tagName: "pet",
        partial: "getPetById",
        completing: "api",
      });
    });
  });

  describe("proxy mode (with fixedSpecName)", () => {
    const fixedSpecName = "yuque";

    it('should parse empty string as completing tag', () => {
      const result = parsePartialApiPath("", fixedSpecName);
      expect(result).toEqual({
        specName: "yuque",
        partial: "",
        completing: "tag",
      });
    });

    it('should parse "doc" as completing tag', () => {
      const result = parsePartialApiPath("doc", fixedSpecName);
      expect(result).toEqual({
        specName: "yuque",
        partial: "doc",
        completing: "tag",
      });
    });

    it('should parse "doc." as completing api', () => {
      const result = parsePartialApiPath("doc.", fixedSpecName);
      expect(result).toEqual({
        specName: "yuque",
        tagName: "doc",
        partial: "",
        completing: "api",
      });
    });

    it('should parse "doc.read" as completing api (partial)', () => {
      const result = parsePartialApiPath("doc.read", fixedSpecName);
      expect(result).toEqual({
        specName: "yuque",
        tagName: "doc",
        partial: "read",
        completing: "api",
      });
    });

    it('should parse "doc.read." as completing api with empty partial', () => {
      const result = parsePartialApiPath("doc.read.", fixedSpecName);
      expect(result).toEqual({
        specName: "yuque",
        tagName: "doc",
        partial: "",
        completing: "api",
      });
    });
  });
});

describe("optionNeedsValue", () => {
  it("should return true for options that need values", () => {
    expect(optionNeedsValue("--env")).toBe(true);
    expect(optionNeedsValue("-e")).toBe(true);
    expect(optionNeedsValue("--output")).toBe(true);
    expect(optionNeedsValue("-o")).toBe(true);
    expect(optionNeedsValue("--header")).toBe(true);
    expect(optionNeedsValue("-H")).toBe(true);
    expect(optionNeedsValue("--query")).toBe(true);
    expect(optionNeedsValue("--global")).toBe(true);
  });

  it("should return false for boolean options", () => {
    expect(optionNeedsValue("--debug")).toBe(false);
    expect(optionNeedsValue("--dry-run")).toBe(false);
    expect(optionNeedsValue("--use-remote")).toBe(false);
    expect(optionNeedsValue("--help")).toBe(false);
  });

  it("should return false for unknown options", () => {
    expect(optionNeedsValue("--unknown")).toBe(false);
    expect(optionNeedsValue("--petId")).toBe(false);
  });
});

describe("isBooleanOption", () => {
  it("should return true for boolean options", () => {
    expect(isBooleanOption("--debug")).toBe(true);
    expect(isBooleanOption("--dry-run")).toBe(true);
    expect(isBooleanOption("--use-remote")).toBe(true);
    expect(isBooleanOption("--help")).toBe(true);
    expect(isBooleanOption("-h")).toBe(true);
  });

  it("should return false for options that need values", () => {
    expect(isBooleanOption("--env")).toBe(false);
    expect(isBooleanOption("--output")).toBe(false);
  });
});

describe("parseWordsToOptionsAndArgs", () => {
  it("should parse empty array", () => {
    const result = parseWordsToOptionsAndArgs([]);
    expect(result.options.size).toBe(0);
    expect(result.args).toEqual([]);
  });

  it("should parse positional arguments", () => {
    const result = parseWordsToOptionsAndArgs(["arg1", "arg2"]);
    expect(result.options.size).toBe(0);
    expect(result.args).toEqual(["arg1", "arg2"]);
  });

  it("should parse boolean options", () => {
    const result = parseWordsToOptionsAndArgs(["--debug", "--use-remote"]);
    expect(result.options.has("debug")).toBe(true);
    expect(result.options.has("use-remote")).toBe(true);
    expect(result.args).toEqual([]);
  });

  it("should parse options with values", () => {
    const result = parseWordsToOptionsAndArgs(["--env", "prod", "--output", "file.json"]);
    expect(result.options.has("env")).toBe(true);
    expect(result.options.has("output")).toBe(true);
    expect(result.args).toEqual([]);
  });

  it("should parse mixed options and arguments", () => {
    const result = parseWordsToOptionsAndArgs([
      "--env",
      "prod",
      "petstore.pet.getPet",
      "--debug",
    ]);
    expect(result.options.has("env")).toBe(true);
    expect(result.options.has("debug")).toBe(true);
    expect(result.args).toEqual(["petstore.pet.getPet"]);
  });

  it("should parse short options", () => {
    const result = parseWordsToOptionsAndArgs(["-e", "prod", "-o", "file.json"]);
    expect(result.options.has("e")).toBe(true);
    expect(result.options.has("o")).toBe(true);
    expect(result.args).toEqual([]);
  });
});

describe("createCompletionInput", () => {
  it("should create input from line and word index", () => {
    const input = createCompletionInput("pontx call petstore.", 2);
    expect(input.line).toBe("pontx call petstore.");
    expect(input.wordIndex).toBe(2);
    expect(input.cursor).toBe(20); // length of line
    expect(input.words).toEqual(["pontx", "call", "petstore."]);
  });

  it("should handle custom cursor position", () => {
    const input = createCompletionInput("pontx call pet", 2, 14);
    expect(input.cursor).toBe(14);
  });

  it("should filter empty words from splitting", () => {
    const input = createCompletionInput("pontx  call   petstore", 2);
    expect(input.words).toEqual(["pontx", "call", "petstore"]);
  });
});

describe("parseCompletionContext", () => {
  describe("command completion", () => {
    it("should detect command position when completing first arg", () => {
      const input = createCompletionInput("pontx ", 1);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("command");
      expect(context.command).toBeUndefined();
    });

    it("should detect command position when partially typing command", () => {
      const input = createCompletionInput("pontx cal", 1);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("command");
    });
  });

  describe("argument completion for call command", () => {
    it("should parse API path completion for call command", () => {
      const input = createCompletionInput("pontx call petstore.", 2);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("argument");
      expect(context.command).toBe("call");
      expect(context.apiPath).toBeDefined();
      expect(context.apiPath?.specName).toBe("petstore");
      expect(context.apiPath?.completing).toBe("tag");
    });

    it("should parse API path completion with tag", () => {
      const input = createCompletionInput("pontx call petstore.pet.", 2);
      const context = parseCompletionContext(input);

      expect(context.apiPath?.specName).toBe("petstore");
      expect(context.apiPath?.tagName).toBe("pet");
      expect(context.apiPath?.completing).toBe("api");
    });

    it("should parse API path in proxy mode", () => {
      const input = createCompletionInput("yuque call doc.", 2);
      const context = parseCompletionContext(input, { fixedSpecName: "yuque" });

      expect(context.apiPath?.specName).toBe("yuque");
      expect(context.apiPath?.tagName).toBe("doc");
      expect(context.apiPath?.completing).toBe("api");
    });
  });

  describe("option completion", () => {
    it("should detect option position when typing --", () => {
      const input = createCompletionInput("pontx call api --", 3);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("option");
      expect(context.command).toBe("call");
    });

    it("should detect option position when partially typing option", () => {
      const input = createCompletionInput("pontx call api --deb", 3);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("option");
    });

    it("should switch to option completion after complete API path (with trailing space)", () => {
      // When API path is complete (has 2+ dots) and current word is empty,
      // should complete options instead of API path
      const input = createCompletionInput("pontx call spec.tag.api ", 3);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("option");
      expect(context.command).toBe("call");
    });

    it("should switch to option completion for complete API path when typing --", () => {
      const input = createCompletionInput("pontx call spec.tag.api --", 3);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("option");
      expect(context.command).toBe("call");
    });
  });

  describe("option-value completion", () => {
    it("should detect option-value position after --env", () => {
      const input = createCompletionInput("pontx call api --env ", 4);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("option-value");
      expect(context.currentOption).toBe("--env");
    });

    it("should detect option-value position after -e", () => {
      const input = createCompletionInput("pontx call api -e ", 4);
      const context = parseCompletionContext(input);

      expect(context.position).toBe("option-value");
      expect(context.currentOption).toBe("-e");
    });

    it("should not detect option-value after boolean flag", () => {
      const input = createCompletionInput("pontx call api --debug ", 4);
      const context = parseCompletionContext(input);

      // After boolean flag, next position is argument, not option-value
      expect(context.position).toBe("argument");
    });
  });

  describe("provided options tracking", () => {
    it("should track provided options", () => {
      const input = createCompletionInput("pontx call api --env prod --debug ", 6);
      const context = parseCompletionContext(input);

      expect(context.providedOptions.has("env")).toBe(true);
      expect(context.providedOptions.has("debug")).toBe(true);
    });
  });

  describe("show-api and gen commands", () => {
    it("should parse API path for show-api command", () => {
      const input = createCompletionInput("pontx show-api petstore.pet.", 2);
      const context = parseCompletionContext(input);

      expect(context.command).toBe("show-api");
      expect(context.apiPath).toBeDefined();
      expect(context.apiPath?.completing).toBe("api");
    });

    it("should parse API path for gen command", () => {
      const input = createCompletionInput("pontx gen petstore.", 2);
      const context = parseCompletionContext(input);

      expect(context.command).toBe("gen");
      expect(context.apiPath).toBeDefined();
      expect(context.apiPath?.completing).toBe("tag");
    });
  });

  describe("non-API commands", () => {
    it("should not parse API path for search command", () => {
      const input = createCompletionInput("pontx search keyword", 2);
      const context = parseCompletionContext(input);

      expect(context.command).toBe("search");
      expect(context.apiPath).toBeUndefined();
      expect(context.position).toBe("argument");
    });

    it("should not parse API path for ls command", () => {
      const input = createCompletionInput("pontx ls ", 2);
      const context = parseCompletionContext(input);

      expect(context.command).toBe("ls");
      expect(context.apiPath).toBeUndefined();
    });
  });
});
