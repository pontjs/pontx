/* eslint-disable no-undef */
import { expect, describe, it } from "vitest";
import { resolveConfig, PontxManager } from "pontx";
import path from "node:path";
import { promises as fsp } from "fs";

const configPath = path.join(__dirname, "pontx.config.ts");

describe("resolveConfig", () => {
  it(
    "should generate api code",
    async () => {
      try {
        const manager = await PontxManager.constructorFromRootDir(__dirname);
        await PontxManager.generateCode(manager);

        const apisCode = await fsp.readFile(
          path.join(__dirname, "dist/petstore/apis.ts"),
          "utf-8"
        );
        expect(
          apisCode.startsWith(
            'import type * as schemas from "./schemas";\nexport type APIs = '
          )
        ).toBe(true);
      } catch (error) {
        console.error("Error in generate api code test:", error);
        throw error;
      }
    },
    {
      timeout: 1000 * 60 * 2, // Reduced timeout to 2 minutes
    }
  );

  it("should resolve config", async () => {
    try {
      const config = await resolveConfig(configPath);
      expect(config).toBeDefined();
    } catch (error) {
      console.error("Error in resolve config test:", error);
      throw error;
    }
  });
});
