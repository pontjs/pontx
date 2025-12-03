/**
 * Tests for global/registry.ts pure functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as os from "os";
import * as path from "path";
import {
  getGlobalConfigDir,
  getGlobalConfigPath,
} from "../../src/global/registry";

describe("getGlobalConfigDir", () => {
  it("should return path under home directory", () => {
    const result = getGlobalConfigDir();

    expect(result).toBe(path.join(os.homedir(), ".pontx"));
  });

  it("should return consistent path on multiple calls", () => {
    const result1 = getGlobalConfigDir();
    const result2 = getGlobalConfigDir();

    expect(result1).toBe(result2);
  });
});

describe("getGlobalConfigPath", () => {
  it("should return config.json path under global config dir", () => {
    const result = getGlobalConfigPath();

    expect(result).toBe(path.join(os.homedir(), ".pontx", "config.json"));
  });

  it("should return consistent path on multiple calls", () => {
    const result1 = getGlobalConfigPath();
    const result2 = getGlobalConfigPath();

    expect(result1).toBe(result2);
  });

  it("should end with config.json", () => {
    const result = getGlobalConfigPath();

    expect(result.endsWith("config.json")).toBe(true);
  });
});
