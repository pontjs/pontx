import { describe, expect, it, vi } from "vitest";

const { loadSpecInfos } = vi.hoisted(() => ({
  loadSpecInfos: vi.fn(async () => {
    throw new Error("local config should not be loaded");
  }),
}));

vi.mock("../../spec-commands", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../spec-commands")>()),
  loadSpecInfos,
}));

vi.mock("fs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("fs")>()),
  readFileSync: vi.fn(() => JSON.stringify({ version: "test" })),
}));

import { createCli } from "../../factory";

describe("createCli Hub startup", () => {
  it("does not load local spec configuration for Hub commands", async () => {
    const program = await createCli({
      rootDir: process.cwd(),
      argv: ["--debug", "hub", "--help"],
    });

    expect(loadSpecInfos).not.toHaveBeenCalled();
    expect(program.commands.some((command) => command.name() === "hub")).toBe(
      true,
    );
  });
});
