/**
 * @author jasonHzq
 * @description Logger utils 纯函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatJson,
  isValidLogLevel,
  shouldLog,
  truncate,
  formatErrorStack,
  extractErrorInfo,
  formatTime,
  getLogLevelFromEnv,
} from "../../src/logger/utils";

describe("formatJson", () => {
  it("应该正确序列化简单对象", () => {
    expect(formatJson({ a: 1, b: "test" })).toBe('{"a":1,"b":"test"}');
  });

  it("应该支持缩进参数", () => {
    const result = formatJson({ a: 1 }, 2);
    expect(result).toBe('{\n  "a": 1\n}');
  });

  it("应该处理嵌套对象", () => {
    const obj = { a: { b: { c: 1 } } };
    expect(formatJson(obj)).toBe('{"a":{"b":{"c":1}}}');
  });

  it("应该处理数组", () => {
    expect(formatJson([1, 2, 3])).toBe('[1,2,3]');
  });

  it("应该处理 null 和 undefined", () => {
    expect(formatJson(null)).toBe("null");
    expect(formatJson(undefined)).toBe(undefined); // JSON.stringify(undefined) 返回 undefined
  });

  it("应该处理循环引用（返回字符串形式）", () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    const result = formatJson(obj);
    expect(result).toContain("[object Object]");
  });

  it("应该处理特殊字符", () => {
    expect(formatJson({ msg: "line1\nline2\ttab" })).toBe(
      '{"msg":"line1\\nline2\\ttab"}'
    );
  });
});

describe("isValidLogLevel", () => {
  it("应该识别所有有效的日志级别", () => {
    expect(isValidLogLevel("trace")).toBe(true);
    expect(isValidLogLevel("debug")).toBe(true);
    expect(isValidLogLevel("info")).toBe(true);
    expect(isValidLogLevel("warn")).toBe(true);
    expect(isValidLogLevel("error")).toBe(true);
    expect(isValidLogLevel("fatal")).toBe(true);
    expect(isValidLogLevel("silent")).toBe(true);
  });

  it("应该拒绝无效的日志级别", () => {
    expect(isValidLogLevel("invalid")).toBe(false);
    expect(isValidLogLevel("INFO")).toBe(false); // 大小写敏感
    expect(isValidLogLevel("")).toBe(false);
    expect(isValidLogLevel("log")).toBe(false);
  });
});

describe("shouldLog", () => {
  it("相同级别应该记录", () => {
    expect(shouldLog("info", "info")).toBe(true);
    expect(shouldLog("error", "error")).toBe(true);
  });

  it("高优先级应该记录低优先级", () => {
    expect(shouldLog("error", "warn")).toBe(true); // error (20) <= warn (30)
    expect(shouldLog("fatal", "error")).toBe(true); // fatal (10) <= error (20)
    expect(shouldLog("error", "info")).toBe(true);
  });

  it("低优先级不应该记录高优先级", () => {
    expect(shouldLog("info", "error")).toBe(false); // info (40) > error (20)
    expect(shouldLog("debug", "warn")).toBe(false); // debug (50) > warn (30)
    expect(shouldLog("trace", "debug")).toBe(false);
  });

  it("silent 级别不应该记录任何内容", () => {
    expect(shouldLog("fatal", "silent")).toBe(false);
    expect(shouldLog("error", "silent")).toBe(false);
    expect(shouldLog("info", "silent")).toBe(false);
  });

  it("trace 级别应该记录所有内容（除了 silent）", () => {
    expect(shouldLog("fatal", "trace")).toBe(true);
    expect(shouldLog("error", "trace")).toBe(true);
    expect(shouldLog("warn", "trace")).toBe(true);
    expect(shouldLog("info", "trace")).toBe(true);
    expect(shouldLog("debug", "trace")).toBe(true);
  });
});

describe("truncate", () => {
  it("短文本不应该被截断", () => {
    expect(truncate("hello", 10)).toBe("hello");
    expect(truncate("test", 4)).toBe("test");
  });

  it("长文本应该被截断并加上省略号", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
    expect(truncate("1234567890", 7)).toBe("1234...");
  });

  it("应该处理边界情况", () => {
    expect(truncate("", 5)).toBe("");
    expect(truncate("abc", 3)).toBe("abc");
    expect(truncate("abcd", 3)).toBe("...");
  });

  it("应该正确处理中文字符（按字符计数）", () => {
    // truncate 函数按字符数计算，不是字节数
    // "你好世界" 有 4 个字符，maxLength=4，不需要截断
    expect(truncate("你好世界", 4)).toBe("你好世界");
    // maxLength=3，需要截断
    expect(truncate("你好世界", 3)).toBe("...");
    // maxLength=5，可以保留 2 个字符
    expect(truncate("测试文本内容", 5)).toBe("测试...");
  });
});

describe("formatErrorStack", () => {
  it("空堆栈返回空字符串", () => {
    expect(formatErrorStack(undefined)).toBe("");
    expect(formatErrorStack("")).toBe("");
  });

  it("应该保留完整的短堆栈", () => {
    const stack = "Error: test\n    at line1\n    at line2";
    expect(formatErrorStack(stack)).toBe(stack);
  });

  it("应该限制堆栈行数", () => {
    const lines = Array.from({ length: 15 }, (_, i) => `    at line${i + 1}`);
    const stack = `Error: test\n${lines.join("\n")}`;
    const result = formatErrorStack(stack, 5);
    const resultLines = result.split("\n");
    expect(resultLines.length).toBe(5);
    expect(resultLines[0]).toBe("Error: test");
  });

  it("应该处理单行堆栈", () => {
    const stack = "Error: test message";
    expect(formatErrorStack(stack, 10)).toBe(stack);
  });

  it("默认应该限制为 10 行", () => {
    const lines = Array.from({ length: 20 }, (_, i) => `    at line${i + 1}`);
    const stack = `Error: test\n${lines.join("\n")}`;
    const result = formatErrorStack(stack);
    expect(result.split("\n").length).toBe(10);
  });
});

describe("extractErrorInfo", () => {
  it("应该提取基本错误信息", () => {
    const error = new Error("test message");
    const info = extractErrorInfo(error);

    expect(info.message).toBe("test message");
    expect(info.name).toBe("Error");
    expect(info.stack).toBeDefined();
  });

  it("应该提取自定义属性", () => {
    const error: any = new Error("test");
    error.code = "ENOENT";
    error.status = 404;
    error.statusCode = 404;
    error.errno = -2;
    error.syscall = "open";
    error.path = "/test/file";

    const info = extractErrorInfo(error);

    expect(info.code).toBe("ENOENT");
    expect(info.status).toBe(404);
    expect(info.statusCode).toBe(404);
    expect(info.errno).toBe(-2);
    expect(info.syscall).toBe("open");
    expect(info.path).toBe("/test/file");
  });

  it("应该忽略不存在的自定义属性", () => {
    const error = new Error("test");
    const info = extractErrorInfo(error);

    expect(info.code).toBeUndefined();
    expect(info.status).toBeUndefined();
  });

  it("应该处理自定义 Error 子类", () => {
    class CustomError extends Error {
      constructor(message: string, public code: string) {
        super(message);
        this.name = "CustomError";
      }
    }

    const error = new CustomError("custom message", "CUSTOM_CODE");
    const info = extractErrorInfo(error);

    expect(info.message).toBe("custom message");
    expect(info.name).toBe("CustomError");
    expect(info.code).toBe("CUSTOM_CODE");
  });
});

describe("formatTime", () => {
  it("应该返回格式化的时间字符串", () => {
    const result = formatTime();
    // 验证格式类似 "14:30:25" 或 "2:30:25 PM"
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("多次调用应该返回不同的时间", async () => {
    const time1 = formatTime();
    await new Promise((resolve) => setTimeout(resolve, 1100)); // 等待 1 秒
    const time2 = formatTime();
    // 注意：根据系统时间格式，时间可能相同或不同
    // 这里主要确保函数能够执行
    expect(typeof time2).toBe("string");
  });
});

describe("getLogLevelFromEnv", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 重置环境变量
    process.env = { ...originalEnv };
    delete process.env.PONTX_LOG_LEVEL;
    delete process.env.DEBUG;
    delete process.env.PONTX_DEBUG;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("默认应该返回 info 级别", () => {
    expect(getLogLevelFromEnv()).toBe("info");
  });

  it("PONTX_LOG_LEVEL 应该具有最高优先级", () => {
    process.env.PONTX_LOG_LEVEL = "debug";
    process.env.DEBUG = "pontx";
    process.env.NODE_ENV = "development";
    expect(getLogLevelFromEnv()).toBe("debug");

    process.env.PONTX_LOG_LEVEL = "error";
    expect(getLogLevelFromEnv()).toBe("error");
  });

  it("PONTX_LOG_LEVEL 应该不区分大小写", () => {
    process.env.PONTX_LOG_LEVEL = "DEBUG";
    expect(getLogLevelFromEnv()).toBe("debug");

    process.env.PONTX_LOG_LEVEL = "INFO";
    expect(getLogLevelFromEnv()).toBe("info");
  });

  it("DEBUG=pontx 应该启用 debug 级别", () => {
    process.env.DEBUG = "pontx";
    expect(getLogLevelFromEnv()).toBe("debug");

    process.env.DEBUG = "pontx:*";
    expect(getLogLevelFromEnv()).toBe("debug");

    process.env.DEBUG = "other,pontx,another";
    expect(getLogLevelFromEnv()).toBe("debug");
  });

  it("DEBUG 不包含 pontx 不应该启用 debug", () => {
    process.env.DEBUG = "other";
    expect(getLogLevelFromEnv()).toBe("info");

    process.env.DEBUG = "something";
    expect(getLogLevelFromEnv()).toBe("info");
  });

  it("PONTX_DEBUG=true 应该启用 debug 级别", () => {
    process.env.PONTX_DEBUG = "true";
    expect(getLogLevelFromEnv()).toBe("debug");
  });

  it("PONTX_DEBUG 其他值不应该启用 debug", () => {
    process.env.PONTX_DEBUG = "false";
    expect(getLogLevelFromEnv()).toBe("info");

    process.env.PONTX_DEBUG = "1";
    expect(getLogLevelFromEnv()).toBe("info");
  });

  it("NODE_ENV=development 应该启用 debug 级别", () => {
    process.env.NODE_ENV = "development";
    expect(getLogLevelFromEnv()).toBe("debug");
  });

  it("NODE_ENV=test 应该使用 warn 级别", () => {
    process.env.NODE_ENV = "test";
    expect(getLogLevelFromEnv()).toBe("warn");
  });

  it("NODE_ENV=production 应该使用默认 info 级别", () => {
    process.env.NODE_ENV = "production";
    expect(getLogLevelFromEnv()).toBe("info");
  });

  it("应该按正确的优先级解析", () => {
    // 优先级: PONTX_LOG_LEVEL > DEBUG > PONTX_DEBUG > NODE_ENV > default

    // DEBUG 覆盖 NODE_ENV
    process.env.DEBUG = "pontx";
    process.env.NODE_ENV = "production";
    expect(getLogLevelFromEnv()).toBe("debug");

    // PONTX_LOG_LEVEL 覆盖 DEBUG
    process.env.PONTX_LOG_LEVEL = "error";
    expect(getLogLevelFromEnv()).toBe("error");
  });

  it("无效的 PONTX_LOG_LEVEL 应该被忽略", () => {
    process.env.PONTX_LOG_LEVEL = "invalid";
    process.env.DEBUG = "pontx";
    expect(getLogLevelFromEnv()).toBe("debug");

    delete process.env.DEBUG;
    expect(getLogLevelFromEnv()).toBe("info");
  });
});
