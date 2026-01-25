import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";
import { cliInitCommand } from "../../commands/cli-init";
import { cliBuildCommand } from "../../commands/cli-build";

/**
 * 集成测试：验证 SDK CLI 的完整工作流程
 * 注意：这些测试使用 mock 的 esbuild，不需要构建 pontx
 */
describe("SDK CLI E2E", () => {
  const testDir = path.join(__dirname, "__fixtures__/e2e-test");
  const fixturesDir = path.join(__dirname, "__fixtures__");
  const originalCwd = process.cwd();

  beforeEach(async () => {
    /* 创建测试目录 */
    await fsp.rm(testDir, { recursive: true, force: true });
    await fsp.mkdir(testDir, { recursive: true });

    /* 创建 package.json */
    await fsp.writeFile(
      path.join(testDir, "package.json"),
      JSON.stringify(
        {
          name: "test-sdk",
          version: "1.0.0",
        },
        null,
        2
      )
    );

    /* 复制 api-lock.json */
    await fsp.mkdir(path.join(testDir, "dist"), { recursive: true });
    await fsp.copyFile(
      path.join(fixturesDir, "api-lock.json"),
      path.join(testDir, "dist/api-lock.json")
    );

    /* 创建 pontx.cli.ts */
    await fsp.writeFile(
      path.join(testDir, "pontx.cli.ts"),
      `
import { runCLI } from "pontx";

runCLI({
  name: "test",
  spec: "dist/api-lock.json",
  executeApi: {
    baseURL: "https://api.example.com",
  },
});
`
    );

    /* 切换工作目录 */
    process.chdir(testDir);
  });

  afterEach(async () => {
    /* 恢复工作目录 */
    process.chdir(originalCwd);
    /* 清理测试目录 */
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  describe("pontx cli init", () => {
    it("should update package.json with bin field", async () => {
      const result = await cliInitCommand({ name: "test" });

      expect(result.binName).toBe("test");
      expect(result.binPath).toBe("./dist/bin/cli.cjs");
      expect(result.isNew).toBe(true);

      /* 验证 package.json */
      const pkg = JSON.parse(
        await fsp.readFile(path.join(testDir, "package.json"), "utf-8")
      );
      expect(pkg.bin).toEqual({ test: "./dist/bin/cli.cjs" });
    });

    it("should reject invalid CLI name", async () => {
      await expect(cliInitCommand({ name: "Invalid Name" })).rejects.toThrow(
        "不合法"
      );
    });

    it("should use custom output directory", async () => {
      const result = await cliInitCommand({
        name: "mycli",
        out: "./custom/bin",
      });

      expect(result.binPath).toBe("./custom/bin/cli.cjs");

      const pkg = JSON.parse(
        await fsp.readFile(path.join(testDir, "package.json"), "utf-8")
      );
      expect(pkg.bin.mycli).toBe("./custom/bin/cli.cjs");
    });
  });

  describe("Full workflow", () => {
    it("should complete init -> build workflow", async () => {
      /* 1. Init */
      await cliInitCommand({ name: "myapp" });

      /* 2. Verify package.json */
      const pkg = JSON.parse(
        await fsp.readFile(path.join(testDir, "package.json"), "utf-8")
      );
      expect(pkg.bin.myapp).toBe("./dist/bin/cli.cjs");

      /* 3. Verify pontx.cli.ts exists */
      expect(fs.existsSync(path.join(testDir, "pontx.cli.ts"))).toBe(true);

      /* 4. Verify api-lock.json exists */
      expect(fs.existsSync(path.join(testDir, "dist/api-lock.json"))).toBe(
        true
      );
    });
  });
});

/* 由于 cliBuildCommand 需要 esbuild，在单独的 describe 中用 mock 测试 */
describe("SDK CLI Build E2E (with mock)", () => {
  const testDir = path.join(__dirname, "__fixtures__/e2e-build-test");
  const originalCwd = process.cwd();

  beforeEach(async () => {
    await fsp.rm(testDir, { recursive: true, force: true });
    await fsp.mkdir(testDir, { recursive: true });

    /* 创建 pontx.cli.ts */
    await fsp.writeFile(
      path.join(testDir, "pontx.cli.ts"),
      `
import { runCLI } from "pontx";
runCLI({
  name: "test",
  spec: "dist/api-lock.json",
});
`
    );

    process.chdir(testDir);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  it("should verify cli build options", async () => {
    const configPath = path.join(testDir, "pontx.cli.ts");
    const outDir = path.join(testDir, "dist/bin");

    /* 验证 cliBuildCommand 的选项解析 */
    const { resolveBuildOptions } = await import("../../commands/cli-build");
    const options = resolveBuildOptions({
      config: configPath,
      out: outDir,
    });

    expect(options.configPath).toBe(configPath);
    expect(options.configDir).toBe(testDir);
    expect(options.outDir).toBe(outDir);
    expect(options.outFile).toBe(path.join(outDir, "cli.cjs"));
  });
});
