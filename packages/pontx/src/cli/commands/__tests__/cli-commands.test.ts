import { describe, it, expect, beforeEach } from "vitest";
import { Command } from "commander";
import { registerCliCommands } from "../cli-commands";

describe("cli-commands", () => {
  let program: Command;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
  });

  describe("registerCliCommands", () => {
    it("should register cli command group", () => {
      registerCliCommands(program);

      const cliCmd = program.commands.find((cmd) => cmd.name() === "cli");
      expect(cliCmd).toBeDefined();
      expect(cliCmd?.description()).toContain("SDK CLI");
    });

    it("should register cli init subcommand", () => {
      registerCliCommands(program);

      const cliCmd = program.commands.find((cmd) => cmd.name() === "cli");
      const initCmd = cliCmd?.commands.find((cmd) => cmd.name() === "init");

      expect(initCmd).toBeDefined();
      expect(initCmd?.description()).toContain("初始化");
    });

    it("should register cli build subcommand", () => {
      registerCliCommands(program);

      const cliCmd = program.commands.find((cmd) => cmd.name() === "cli");
      const buildCmd = cliCmd?.commands.find((cmd) => cmd.name() === "build");

      expect(buildCmd).toBeDefined();
      expect(buildCmd?.description()).toContain("构建");
    });

    it("should require --name option for init command", () => {
      registerCliCommands(program);

      /* 尝试不带 --name 执行 init */
      expect(() => {
        program.parse(["node", "test", "cli", "init"], { from: "user" });
      }).toThrow();
    });
  });
});
