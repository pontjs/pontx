import { Command } from "commander";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerHubCommands } from "../commands";

describe("registerHubCommands", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerHubCommands(program);
  });

  it("registers the config-independent hub command group", () => {
    const hub = program.commands.find((command) => command.name() === "hub");
    expect(hub).toBeDefined();
    expect(hub?.commands.map((command) => command.name())).toEqual([
      "list",
      "search",
      "show",
      "preview",
      "call",
      "sdk",
      "skill",
    ]);
  });

  it("lists catalog entries from the configured Hub URL", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({
        version: "v1",
        data: [
          {
            slug: "github",
            name: "GitHub REST API",
            provider: "GitHub",
            category: "Developer Tools",
            summary: { zh: "代码托管", en: "Code hosting" },
            packageName: "@pontx/api-github",
            sdkVersion: "0.1.0",
            operationCount: 2,
            authTypes: ["bearer"],
          },
        ],
      }),
    );
    const output = vi.spyOn(console, "log").mockImplementation(() => {});

    await program.parseAsync(
      ["hub", "--url", "https://hub.example", "list"],
      { from: "user" },
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://hub.example/api/v1/catalog",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      }),
    );
    expect(output).toHaveBeenCalledWith(
      expect.stringContaining("@pontx/api-github"),
    );

    fetchMock.mockRestore();
    output.mockRestore();
  });
});
