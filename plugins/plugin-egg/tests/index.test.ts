import * as path from "path";
import { resolveConfig, PontxManager } from "pontx";
import { describe, it, expect } from "vitest";
import fsp from "fs/promises";

describe("test", () => {
  it(
    "test",
    async () => {
      const configPath = path.resolve(__dirname, "./pontx.config.ts");
      const rootDir = path.resolve(__dirname, "..");
      const pontxManager = await PontxManager.constructorFromPontxConfigPath(
        configPath,
        rootDir
      );

      await PontxManager.generateCode(pontxManager);
      const code = await fsp.readFile(
        path.join(__dirname, "./services/apiMeta/controllers.ts"),
        "utf-8"
      );
      expect(code.includes("export interface ")).toBe(true);
    },
    {
      timeout: 10000 * 100,
    }
  );
});
