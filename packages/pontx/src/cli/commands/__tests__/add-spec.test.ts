import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as path from "path";
import * as fsp from "fs/promises";
import { addSpecCommand } from "../add-spec";

describe("add-spec", () => {
  const testDir = path.join(__dirname, "__fixtures__/add-spec-test");
  const nodeModulesDir = path.join(testDir, "node_modules");
  const sdkDir = path.join(nodeModulesDir, "test-sdk");
  const pkgPath = path.join(testDir, "package.json");

  beforeEach(async () => {
    /* 创建测试目录结构 */
    await fsp.mkdir(testDir, { recursive: true });
    await fsp.mkdir(path.join(sdkDir, "dist/bin"), { recursive: true });

    /* 创建 SDK 的 package.json (包含 pontx.specDir) */
    await fsp.writeFile(
      path.join(sdkDir, "package.json"),
      JSON.stringify(
        {
          name: "test-sdk",
          version: "1.0.0",
          pontx: {
            specDir: "./dist/bin",
          },
        },
        null,
        2
      )
    );

    /* 创建 SDK 的 api-lock.json */
    await fsp.writeFile(
      path.join(sdkDir, "dist/bin/api-lock.json"),
      JSON.stringify({ name: "test-api", apis: [] }, null, 2)
    );

    /* 创建项目的 package.json */
    await fsp.writeFile(
      pkgPath,
      JSON.stringify(
        {
          name: "test-project",
          version: "1.0.0",
        },
        null,
        2
      )
    );

    /* 模拟 require.resolve 能找到 SDK */
    const Module = require("module");
    const originalResolve = Module._resolveFilename;
    Module._resolveFilename = function (request: string, ...args: any[]) {
      if (request === "test-sdk/package.json") {
        return path.join(sdkDir, "package.json");
      }
      if (request === "@myorg/user-sdk/package.json") {
        return path.join(nodeModulesDir, "@myorg/user-sdk/package.json");
      }
      return originalResolve.call(this, request, ...args);
    };
  });

  afterEach(async () => {
    /* 清理测试目录 */
    await fsp.rm(testDir, { recursive: true, force: true });

    /* 恢复 require.resolve */
    const Module = require("module");
    const originalResolve = Module._resolveFilename;
    Module._resolveFilename = originalResolve;
  });

  describe("addSpecCommand", () => {
    it("should add spec to package.json (string format)", async () => {
      /* Mock console.log */
      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

      /* Mock process.cwd to return testDir */
      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await addSpecCommand("test-sdk", {});

      /* 验证 package.json 已更新 */
      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.pontx).toBeDefined();
      expect(pkg.pontx.specs).toEqual(["test-sdk"]);

      mockLog.mockRestore();
      mockCwd.mockRestore();
    });

    it("should add spec with custom name (object format)", async () => {
      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await addSpecCommand("test-sdk", { name: "my-custom-api" });

      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.pontx.specs).toEqual([
        { name: "my-custom-api", sdk: "test-sdk" },
      ]);

      mockLog.mockRestore();
      mockCwd.mockRestore();
    });

    it("should append to existing specs array", async () => {
      /* 先添加一个 pontx.specs */
      await fsp.writeFile(
        pkgPath,
        JSON.stringify(
          {
            name: "test-project",
            version: "1.0.0",
            pontx: {
              specs: ["existing-sdk"],
            },
          },
          null,
          2
        )
      );

      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await addSpecCommand("test-sdk", {});

      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.pontx.specs).toEqual(["existing-sdk", "test-sdk"]);

      mockLog.mockRestore();
      mockCwd.mockRestore();
    });

    it("should throw error when SDK not found", async () => {
      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await expect(addSpecCommand("non-existent-sdk", {})).rejects.toThrow(
        "未找到 SDK 包"
      );

      mockCwd.mockRestore();
    });

    it("should throw error when SDK missing pontx.specDir", async () => {
      /* 创建一个没有 pontx.specDir 的 SDK */
      await fsp.writeFile(
        path.join(sdkDir, "package.json"),
        JSON.stringify({ name: "test-sdk", version: "1.0.0" }, null, 2)
      );

      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await expect(addSpecCommand("test-sdk", {})).rejects.toThrow(
        "未配置 pontx.specDir"
      );

      mockCwd.mockRestore();
    });

    it("should throw error when spec file not found", async () => {
      /* 删除 api-lock.json */
      await fsp.rm(path.join(sdkDir, "dist/bin/api-lock.json"));

      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await expect(addSpecCommand("test-sdk", {})).rejects.toThrow(
        "未找到 spec 文件"
      );

      mockCwd.mockRestore();
    });

    it("should throw error when package.json not found", async () => {
      /* 删除 package.json */
      await fsp.rm(pkgPath);

      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await expect(addSpecCommand("test-sdk", {})).rejects.toThrow(
        "未找到 package.json"
      );

      mockCwd.mockRestore();
    });

    it("should throw error for duplicate SDK", async () => {
      /* 先添加一个相同的 SDK */
      await fsp.writeFile(
        pkgPath,
        JSON.stringify(
          {
            name: "test-project",
            version: "1.0.0",
            pontx: {
              specs: ["test-sdk"],
            },
          },
          null,
          2
        )
      );

      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await expect(addSpecCommand("test-sdk", {})).rejects.toThrow(
        '已存在于 pontx.specs'
      );

      mockCwd.mockRestore();
    });

    it("should handle spec missing name field", async () => {
      /* 创建没有 name 字段的 spec */
      await fsp.writeFile(
        path.join(sdkDir, "dist/bin/api-lock.json"),
        JSON.stringify({ apis: [] }, null, 2)
      );

      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await expect(addSpecCommand("test-sdk", {})).rejects.toThrow(
        "缺少 name 字段"
      );

      mockCwd.mockRestore();
    });
  });

  describe("scoped packages", () => {
    it("should handle scoped package names", async () => {
      /* 创建 scoped package 目录 */
      const scopedSdkDir = path.join(nodeModulesDir, "@myorg/user-sdk");
      await fsp.mkdir(path.join(scopedSdkDir, "dist/bin"), { recursive: true });

      await fsp.writeFile(
        path.join(scopedSdkDir, "package.json"),
        JSON.stringify(
          {
            name: "@myorg/user-sdk",
            version: "1.0.0",
            pontx: { specDir: "./dist/bin" },
          },
          null,
          2
        )
      );

      await fsp.writeFile(
        path.join(scopedSdkDir, "dist/bin/api-lock.json"),
        JSON.stringify({ name: "user-api", apis: [] }, null, 2)
      );

      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const mockCwd = vi.spyOn(process, "cwd").mockReturnValue(testDir);

      await addSpecCommand("@myorg/user-sdk", {});

      const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
      expect(pkg.pontx.specs).toEqual(["@myorg/user-sdk"]);

      mockLog.mockRestore();
      mockCwd.mockRestore();
    });
  });
});
