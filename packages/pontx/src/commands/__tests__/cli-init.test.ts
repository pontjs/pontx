import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fsp from "fs/promises";
import { cliInitCommand, formatInitResult } from "../cli-init";

describe("cli-init", () => {
  const testDir = path.join(__dirname, "__fixtures__/cli-init-test");
  const pkgPath = path.join(testDir, "package.json");
  const originalCwd = process.cwd();

  beforeEach(async () => {
    /* 创建测试目录 */
    await fsp.mkdir(testDir, { recursive: true });
    /* 切换工作目录 */
    process.chdir(testDir);
  });

  afterEach(async () => {
    /* 恢复工作目录 */
    process.chdir(originalCwd);
    /* 清理测试目录 */
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  describe("cliInitCommand", () => {
    it("should add bin field to package.json", async () => {
      /* 创建初始 package.json */
      await fsp.writeFile(
        pkgPath,
        JSON.stringify({ name: "test-sdk", version: "1.0.0" }, null, 2)
      );

      const result = await cliInitCommand({ name: "x" });

      expect(result.binName).toBe("x");
      expect(result.binPath).toBe("./dist/bin/cli.cjs");
      expect(result.isNew).toBe(true);

      /* 验证文件内容 */
      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.bin).toEqual({ x: "./dist/bin/cli.cjs" });
    });

    it("should use custom output directory", async () => {
      await fsp.writeFile(
        pkgPath,
        JSON.stringify({ name: "test-sdk" }, null, 2)
      );

      const result = await cliInitCommand({ name: "my-cli", out: "./build" });

      expect(result.binPath).toBe("./build/cli.cjs");

      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.bin["my-cli"]).toBe("./build/cli.cjs");
    });

    it("should update existing bin field", async () => {
      await fsp.writeFile(
        pkgPath,
        JSON.stringify(
          {
            name: "test-sdk",
            bin: { x: "./old/path.js" },
          },
          null,
          2
        )
      );

      const result = await cliInitCommand({ name: "x" });

      expect(result.isNew).toBe(false);

      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.bin.x).toBe("./dist/bin/cli.cjs");
    });

    it("should preserve existing bin entries", async () => {
      await fsp.writeFile(
        pkgPath,
        JSON.stringify(
          {
            name: "test-sdk",
            bin: { other: "./other.js" },
          },
          null,
          2
        )
      );

      await cliInitCommand({ name: "x" });

      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.bin).toEqual({
        other: "./other.js",
        x: "./dist/bin/cli.cjs",
      });
    });

    it("should throw error for invalid name", async () => {
      await fsp.writeFile(pkgPath, JSON.stringify({ name: "test-sdk" }));

      await expect(cliInitCommand({ name: "" })).rejects.toThrow(
        "CLI 名称不能为空"
      );

      await expect(cliInitCommand({ name: "Invalid" })).rejects.toThrow(
        "不合法"
      );

      await expect(cliInitCommand({ name: "123abc" })).rejects.toThrow(
        "不合法"
      );
    });

    it("should throw error when package.json not found", async () => {
      /* 不创建 package.json */
      await expect(cliInitCommand({ name: "x" })).rejects.toThrow(
        "未找到 package.json"
      );
    });

    it("should throw error for invalid package.json", async () => {
      await fsp.writeFile(pkgPath, "{ invalid json }");

      await expect(cliInitCommand({ name: "x" })).rejects.toThrow("解析失败");
    });

    it("should preserve indentation", async () => {
      /* 使用 4 空格缩进 */
      await fsp.writeFile(
        pkgPath,
        JSON.stringify({ name: "test-sdk" }, null, 4)
      );

      await cliInitCommand({ name: "x" });

      const content = await fsp.readFile(pkgPath, "utf-8");
      expect(content).toContain('    "name"');
    });
  });

  describe("formatInitResult", () => {
    it("should format new entry correctly", () => {
      const result = formatInitResult({
        packageJsonPath: "/path/to/package.json",
        binName: "x",
        binPath: "./dist/bin/cli.cjs",
        isNew: true,
      });

      expect(result).toContain("已添加");
      expect(result).toContain("bin.x");
    });

    it("should format update correctly", () => {
      const result = formatInitResult({
        packageJsonPath: "/path/to/package.json",
        binName: "x",
        binPath: "./dist/bin/cli.cjs",
        isNew: false,
      });

      expect(result).toContain("已更新");
    });
  });
});
