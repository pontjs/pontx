import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";
import { resolveBuildOptions, generateEsbuildConfig } from "../cli-build";

describe("cli-build", () => {
  describe("resolveBuildOptions", () => {
    it("should use default config path when not specified", () => {
      const result = resolveBuildOptions({});
      expect(result.configPath).toBe(path.resolve("./pontx.cli.ts"));
    });

    it("should use custom config path when specified", () => {
      const result = resolveBuildOptions({ config: "./custom/cli.ts" });
      expect(result.configPath).toBe(path.resolve("./custom/cli.ts"));
    });

    it("should use default output directory when not specified", () => {
      const result = resolveBuildOptions({});
      expect(result.outDir).toBe(path.resolve("./dist/bin"));
    });

    it("should use custom output directory when specified", () => {
      const result = resolveBuildOptions({ out: "./custom/output" });
      expect(result.outDir).toBe(path.resolve("./custom/output"));
    });

    it("should derive configDir from configPath", () => {
      const result = resolveBuildOptions({ config: "./src/pontx.cli.ts" });
      expect(result.configDir).toBe(path.resolve("./src"));
    });

    it("should set outFile correctly", () => {
      const result = resolveBuildOptions({ out: "./dist/bin" });
      expect(result.outFile).toBe(path.resolve("./dist/bin/cli.cjs"));
    });
  });

  describe("generateEsbuildConfig", () => {
    it("should generate correct esbuild config", () => {
      const configPath = "/project/pontx.cli.ts";
      const outFile = "/project/dist/bin/cli.cjs";

      const config = generateEsbuildConfig(configPath, outFile);

      expect(config.entryPoints).toEqual([configPath]);
      expect(config.bundle).toBe(true);
      expect(config.platform).toBe("node");
      expect(config.format).toBe("cjs");
      expect(config.outfile).toBe(outFile);
      expect(config.external).toEqual(["pontx"]);
      /* banner 包含 shebang 和 __CLI_DIR__ 注入 */
      expect(config.banner?.js).toContain("#!/usr/bin/env node");
      expect(config.banner?.js).toContain("globalThis.__CLI_DIR__ = __dirname");
    });

    it("should inject __CLI_DIR__ in banner", () => {
      const config = generateEsbuildConfig(
        "/my/project/pontx.cli.ts",
        "/my/project/dist/bin/cli.cjs"
      );

      /* 验证 banner 包含必要的全局变量注入 */
      expect(config.banner?.js).toContain("#!/usr/bin/env node");
      expect(config.banner?.js).toContain("__CLI_DIR__");
      /* 不包含旧的全局变量 */
      expect(config.banner?.js).not.toContain("__CLI_ROOT_DIR__");
      expect(config.banner?.js).not.toContain("__CLI_SPEC_PATH__");
    });
  });
});

/* 用于追踪 mock 调用的全局变量 */
let mockBuildCalls: any[] = [];

vi.mock("esbuild", () => ({
  build: async (options: any) => {
    mockBuildCalls.push(options);
    /* 模拟 esbuild 的输出，使用 banner 中的内容 */
    const outputContent = `${options.banner?.js || "#!/usr/bin/env node"}
"use strict";
console.log("test cli");
`;
    const outDir = path.dirname(options.outfile);
    await fsp.mkdir(outDir, { recursive: true });
    await fsp.writeFile(options.outfile, outputContent);
    return {};
  },
}));

/* Mock PontxManager */
vi.mock("../../manager", () => ({
  PontxManager: {
    constructorFromRootDir: vi.fn().mockResolvedValue({
      resolvedConfig: {
        origins: [
          {
            name: "test-api",
            spec: {
              name: "test-api",
              apis: {},
            },
          },
        ],
      },
    }),
  },
}));

describe("cli-build integration", () => {
  const testDir = path.join(__dirname, "__fixtures__/cli-build-test");
  const configPath = path.join(testDir, "pontx.cli.ts");
  const outDir = path.join(testDir, "dist/bin");
  const outFile = path.join(outDir, "cli.cjs");

  beforeEach(async () => {
    mockBuildCalls = [];
    vi.clearAllMocks();
    /* 创建测试目录和配置文件 */
    await fsp.mkdir(testDir, { recursive: true });

    /* 创建配置文件（不包含 spec 字段）*/
    await fsp.writeFile(
      configPath,
      `import { runCLI } from "pontx";

export default runCLI({
  name: "test",
  executeApi: {
    baseURL: "https://api.example.com"
  }
});
`
    );
  });

  afterEach(async () => {
    /* 清理测试目录 */
    await fsp.rm(testDir, { recursive: true, force: true });
  });

  it("should build CLI successfully", async () => {
    const { cliBuildCommand } = await import("../cli-build");

    await cliBuildCommand({
      config: configPath,
      out: outDir,
    });

    /* 验证 esbuild.build 被调用 */
    expect(mockBuildCalls.length).toBe(1);

    /* 验证 esbuild 配置参数 */
    const buildConfig = mockBuildCalls[0];
    expect(buildConfig.entryPoints).toEqual([configPath]);
    expect(buildConfig.bundle).toBe(true);
    expect(buildConfig.platform).toBe("node");
    expect(buildConfig.format).toBe("cjs");
    expect(buildConfig.outfile).toBe(outFile);
    expect(buildConfig.external).toEqual(["pontx"]);
    /* banner 包含 shebang 和 __CLI_DIR__ 注入 */
    expect(buildConfig.banner?.js).toContain("#!/usr/bin/env node");
    expect(buildConfig.banner?.js).toContain("__CLI_DIR__");

    /* 验证输出文件存在 */
    expect(fs.existsSync(outFile)).toBe(true);

    /* 验证文件内容包含 shebang */
    const content = await fsp.readFile(outFile, "utf-8");
    expect(content.startsWith("#!/usr/bin/env node")).toBe(true);

    /* 验证 api-lock.json 被复制到 bin/ 目录 */
    const apiLockPath = path.join(outDir, "api-lock.json");
    expect(fs.existsSync(apiLockPath)).toBe(true);
  });

  it("should throw error when config file not exists", async () => {
    const { cliBuildCommand } = await import("../cli-build");

    await expect(
      cliBuildCommand({
        config: "/non/existent/path.ts",
        out: outDir,
      })
    ).rejects.toThrow("配置文件不存在");
  });
});
