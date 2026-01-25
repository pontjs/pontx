/**
 * @author jasonHzq
 * @description Logger 核心功能集成测试
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PontxLogger, createLogger } from "../../src/logger/logger";
import { Writable } from "stream";

/**
 * 创建内存流用于捕获日志输出
 */
class MemoryStream extends Writable {
  public data: string[] = [];

  _write(chunk: any, encoding: string, callback: () => void): void {
    this.data.push(chunk.toString());
    callback();
  }

  getOutput(): string {
    return this.data.join("");
  }

  clear(): void {
    this.data = [];
  }
}

describe("PontxLogger", () => {
  let output: MemoryStream;
  let logger: PontxLogger;

  beforeEach(() => {
    output = new MemoryStream();
    logger = new PontxLogger({
      level: "trace",
      destination: output,
      colorize: false, // 测试时禁用颜色
    });
  });

  describe("日志级别控制", () => {
    it("应该正确设置和获取日志级别", () => {
      expect(logger.level).toBe("trace");

      logger.level = "info";
      expect(logger.level).toBe("info");

      logger.level = "error";
      expect(logger.level).toBe("error");
    });

    it("应该根据级别过滤日志", () => {
      logger.level = "warn";

      logger.trace("trace message");
      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      const log = output.getOutput();
      expect(log).not.toContain("trace message");
      expect(log).not.toContain("debug message");
      expect(log).not.toContain("info message");
      expect(log).toContain("warn message");
      expect(log).toContain("error message");
    });

    it("isLevelEnabled 应该正确判断级别", () => {
      logger.level = "info";

      expect(logger.isLevelEnabled("trace")).toBe(false);
      expect(logger.isLevelEnabled("debug")).toBe(false);
      expect(logger.isLevelEnabled("info")).toBe(true);
      expect(logger.isLevelEnabled("warn")).toBe(true);
      expect(logger.isLevelEnabled("error")).toBe(true);
      expect(logger.isLevelEnabled("fatal")).toBe(true);
    });
  });

  describe("日志方法", () => {
    it("trace 方法应该输出 TRACE 标签", () => {
      logger.trace("trace message");
      const log = output.getOutput();
      expect(log).toContain("TRACE");
      expect(log).toContain("trace message");
    });

    it("debug 方法应该输出 DEBUG 标签", () => {
      logger.debug("debug message");
      const log = output.getOutput();
      expect(log).toContain("DEBUG");
      expect(log).toContain("debug message");
    });

    it("info 方法应该输出 INFO 标签", () => {
      logger.info("info message");
      const log = output.getOutput();
      expect(log).toContain("INFO");
      expect(log).toContain("info message");
    });

    it("warn 方法应该输出 WARN 标签", () => {
      logger.warn("warn message");
      const log = output.getOutput();
      expect(log).toContain("WARN");
      expect(log).toContain("warn message");
    });

    it("error 方法应该输出 ERROR 标签", () => {
      logger.error("error message");
      const log = output.getOutput();
      expect(log).toContain("ERROR");
      expect(log).toContain("error message");
    });

    it("fatal 方法应该输出 FATAL 标签", () => {
      logger.fatal("fatal message");
      const log = output.getOutput();
      expect(log).toContain("FATAL");
      expect(log).toContain("fatal message");
    });
  });

  describe("错误处理", () => {
    it("error 方法应该接受 Error 对象", () => {
      const error = new Error("test error");
      logger.error("operation failed", error);

      const log = output.getOutput();
      expect(log).toContain("operation failed");
      expect(log).toContain("test error");
      expect(log).toContain("Error:");
    });

    it("error 方法应该接受元数据对象", () => {
      logger.error("operation failed", { code: "ERR001", userId: 123 });

      const log = output.getOutput();
      expect(log).toContain("operation failed");
      expect(log).toContain("ERR001");
      expect(log).toContain("123");
    });

    it("error 方法应该同时接受 Error 和元数据", () => {
      const error = new Error("test error");
      logger.error("operation failed", error, { userId: 456 });

      const log = output.getOutput();
      expect(log).toContain("operation failed");
      expect(log).toContain("test error");
      expect(log).toContain("456");
    });

    it("fatal 方法应该与 error 方法行为一致", () => {
      const error = new Error("fatal error");
      logger.fatal("system crash", error, { component: "core" });

      const log = output.getOutput();
      expect(log).toContain("system crash");
      expect(log).toContain("fatal error");
      expect(log).toContain("core");
    });

    it("应该追踪已记录的错误", () => {
      const error = new Error("test");
      expect(logger.hasErrorLogged(error)).toBe(false);

      logger.error("first log", error);
      expect(logger.hasErrorLogged(error)).toBe(true);
    });
  });

  describe("元数据处理", () => {
    it("应该输出简单元数据", () => {
      logger.info("message", { key: "value", num: 123 });

      const log = output.getOutput();
      expect(log).toContain("message");
      expect(log).toContain('"key"');
      expect(log).toContain('"value"');
      expect(log).toContain("123");
    });

    it("应该输出嵌套元数据", () => {
      logger.info("message", {
        user: { id: 1, name: "test" },
        settings: { theme: "dark" },
      });

      const log = output.getOutput();
      expect(log).toContain("message");
      expect(log).toContain('"user"');
      expect(log).toContain('"settings"');
      expect(log).toContain('"theme"');
      expect(log).toContain('"dark"');
    });

    it("应该忽略内部字段 timestamp 和 prefix", () => {
      logger.info("message", {
        timestamp: true,
        prefix: "[custom]",
        data: "value",
      });

      const log = output.getOutput();
      // 元数据中不应该包含 timestamp 和 prefix 字段
      expect(log).toContain('"data"');
      expect(log).toContain('"value"');
    });
  });

  describe("warnOnce", () => {
    it("相同消息只应该记录一次", () => {
      logger.warnOnce("deprecated feature");
      logger.warnOnce("deprecated feature");
      logger.warnOnce("deprecated feature");

      const log = output.getOutput();
      const matches = log.match(/deprecated feature/g);
      expect(matches).toHaveLength(1);
    });

    it("不同消息应该都被记录", () => {
      logger.warnOnce("warning 1");
      logger.warnOnce("warning 2");
      logger.warnOnce("warning 1"); // 重复

      const log = output.getOutput();
      expect(log).toContain("warning 1");
      expect(log).toContain("warning 2");
      const matches = log.match(/warning 1/g);
      expect(matches).toHaveLength(1);
    });

    it("应该设置 hasWarned 标志", () => {
      expect(logger.hasWarned).toBe(false);
      logger.warnOnce("test");
      expect(logger.hasWarned).toBe(true);
    });
  });

  describe("hasWarned 标志", () => {
    it("warn 应该设置 hasWarned", () => {
      expect(logger.hasWarned).toBe(false);
      logger.warn("test");
      expect(logger.hasWarned).toBe(true);
    });

    it("error 应该设置 hasWarned", () => {
      expect(logger.hasWarned).toBe(false);
      logger.error("test");
      expect(logger.hasWarned).toBe(true);
    });

    it("fatal 应该设置 hasWarned", () => {
      expect(logger.hasWarned).toBe(false);
      logger.fatal("test");
      expect(logger.hasWarned).toBe(true);
    });

    it("info/debug/trace 不应该设置 hasWarned", () => {
      logger.info("test");
      expect(logger.hasWarned).toBe(false);

      logger.debug("test");
      expect(logger.hasWarned).toBe(false);

      logger.trace("test");
      expect(logger.hasWarned).toBe(false);
    });
  });

  describe("JSON 格式输出", () => {
    beforeEach(() => {
      output = new MemoryStream();
      logger = new PontxLogger({
        level: "trace",
        destination: output,
        json: true,
      });
    });

    it("应该输出有效的 JSON", () => {
      logger.info("test message");

      const log = output.getOutput().trim();
      const parsed = JSON.parse(log);

      expect(parsed.level).toBe("info");
      expect(parsed.msg).toBe("test message");
      expect(parsed.time).toBeDefined();
    });

    it("JSON 应该包含错误信息", () => {
      const error = new Error("test error");
      logger.error("operation failed", error);

      const log = output.getOutput().trim();
      const parsed = JSON.parse(log);

      expect(parsed.level).toBe("error");
      expect(parsed.msg).toBe("operation failed");
      expect(parsed.error).toBe("test error");
      expect(parsed.errorName).toBe("Error");
      expect(parsed.stack).toBeDefined();
    });

    it("JSON 应该包含元数据", () => {
      logger.info("message", { userId: 123, action: "login" });

      const log = output.getOutput().trim();
      const parsed = JSON.parse(log);

      expect(parsed.level).toBe("info");
      expect(parsed.msg).toBe("message");
      expect(parsed.userId).toBe(123);
      expect(parsed.action).toBe("login");
    });
  });

  describe("前缀配置", () => {
    it("应该使用默认前缀", () => {
      logger.info("test");
      const log = output.getOutput();
      expect(log).toContain("[pontx]");
    });

    it("应该使用自定义前缀", () => {
      const customLogger = new PontxLogger({
        level: "info",
        prefix: "[custom prefix]",
        destination: output,
        colorize: false,
      });

      customLogger.info("test");
      const log = output.getOutput();
      expect(log).toContain("[custom prefix]");
    });

    it("元数据中的 prefix 应该覆盖默认前缀", () => {
      logger.info("test", { prefix: "[override]" });
      const log = output.getOutput();
      expect(log).toContain("[override]");
    });
  });

  describe("时间戳配置", () => {
    it("默认不应该输出时间戳", () => {
      logger.info("test");
      const log = output.getOutput();
      // 不包含时间格式（如 14:30:45）
      expect(log).not.toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("元数据中设置 timestamp 应该输出时间", () => {
      logger.info("test", { timestamp: true });
      const log = output.getOutput();
      // 应该包含时间格式
      expect(log).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });
  });
});

describe("createLogger", () => {
  it("应该创建默认 logger", () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(logger.level).toBe("info");
  });

  it("应该支持指定日志级别", () => {
    const logger = createLogger("debug");
    expect(logger.level).toBe("debug");
  });

  it("应该支持自定义选项", () => {
    const output = new MemoryStream();
    const logger = createLogger("trace", {
      prefix: "[test]",
      destination: output,
      colorize: false,
    }) as PontxLogger;

    logger.info("test message");
    const log = output.getOutput();

    expect(log).toContain("[test]");
    expect(log).toContain("test message");
  });

  it("应该支持自定义 logger", () => {
    const mockLogger = {
      level: "info" as const,
      isLevelEnabled: vi.fn(() => true),
      trace: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      fatal: vi.fn(),
      warnOnce: vi.fn(),
      hasWarned: false,
      hasErrorLogged: vi.fn(() => false),
    };

    const logger = createLogger("info", { customLogger: mockLogger });
    expect(logger).toBe(mockLogger);
  });
});

describe("Logger 边界情况", () => {
  let output: MemoryStream;
  let logger: PontxLogger;

  beforeEach(() => {
    output = new MemoryStream();
    logger = new PontxLogger({
      level: "trace",
      destination: output,
      colorize: false,
    });
  });

  it("应该处理空消息", () => {
    logger.info("");
    const log = output.getOutput();
    expect(log).toContain("INFO");
  });

  it("应该处理多行消息", () => {
    logger.info("line1\nline2\nline3");
    const log = output.getOutput();
    expect(log).toContain("line1");
    expect(log).toContain("line2");
    expect(log).toContain("line3");
  });

  it("应该处理特殊字符", () => {
    logger.info('message with "quotes" and \'apostrophes\'');
    const log = output.getOutput();
    expect(log).toContain("quotes");
    expect(log).toContain("apostrophes");
  });

  it("应该处理大量数据", () => {
    const largeData = { items: Array.from({ length: 100 }, (_, i) => i) };
    logger.info("large data", largeData);
    const log = output.getOutput();
    expect(log).toContain("large data");
    expect(log.length).toBeGreaterThan(100);
  });

  it("silent 级别不应该输出任何日志", () => {
    logger.level = "silent";

    logger.fatal("fatal");
    logger.error("error");
    logger.warn("warn");
    logger.info("info");
    logger.debug("debug");
    logger.trace("trace");

    const log = output.getOutput();
    expect(log).toBe("");
  });
});
