import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import * as fsp from "fs/promises";

/* 在所有测试之前 mock commander */
const mockParseAsync = vi.fn().mockResolvedValue(undefined);
const mockVersion = vi.fn().mockReturnThis();

vi.mock("commander", () => {
  const Command = vi.fn().mockImplementation((name) => {
    const commands: any[] = [];
    const instance = {
      name: () => name,
      version: mockVersion,
      command: vi.fn().mockImplementation(() => {
        const subCmd = {
          description: vi.fn().mockReturnThis(),
          option: vi.fn().mockReturnThis(),
          allowUnknownOption: vi.fn().mockReturnThis(),
          action: vi.fn().mockReturnThis(),
        };
        commands.push(subCmd);
        return subCmd;
      }),
      parseAsync: mockParseAsync,
      _commands: commands,
    };
    return instance;
  });
  return { Command };
});

describe("sdk-cli/run-cli", () => {
  const testDir = path.join(__dirname, "__fixtures__/run-cli-test");
  const apiLockPath = path.join(testDir, "api-lock.json");

  beforeEach(async () => {
    vi.clearAllMocks();

    /* 创建测试目录和 api-lock.json 文件 */
    await fsp.mkdir(testDir, { recursive: true });
    await fsp.writeFile(
      apiLockPath,
      JSON.stringify({
        name: "test-api",
        apis: {},
      })
    );

    /* 设置 __CLI_DIR__ 指向测试目录 */
    (globalThis as any).__CLI_DIR__ = testDir;
  });

  afterEach(async () => {
    /* 清理测试目录 */
    await fsp.rm(testDir, { recursive: true, force: true });
    delete (globalThis as any).__CLI_DIR__;
  });

  it("should load api-lock.json from __CLI_DIR__", async () => {
    const { runCLI } = await import("../run-cli");

    /* 不应抛出错误 */
    expect(() => {
      runCLI({
        name: "test",
        executeApi: {
          baseURL: "https://api.example.com",
        },
      });
    }).not.toThrow();

    /* 验证 parseAsync 被调用 */
    expect(mockParseAsync).toHaveBeenCalled();
  });

  it("should create CLI with configuration", async () => {
    const { runCLI } = await import("../run-cli");

    expect(() => {
      runCLI({
        name: "test",
        executeApi: {
          baseURL: "https://api.example.com",
        },
      });
    }).not.toThrow();

    expect(mockParseAsync).toHaveBeenCalled();
  });

  it("should create CLI with minimal config", async () => {
    const { runCLI } = await import("../run-cli");

    runCLI({
      name: "my-cli",
    });

    /* 验证 parseAsync 被调用 */
    expect(mockParseAsync).toHaveBeenCalled();
  });
});
