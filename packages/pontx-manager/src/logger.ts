export class PontLoggerSpec {
  originName?: string;
  processType: "read" | "fetch" | "parser" | "diff" | "generate";
  message: string;
  stack?: any;
}

const processTypeNameMap = {
  read: "本地文件读取",
  fetch: "远程数据获取",
  parser: "元数据解析",
  diff: "数据对比",
  generate: "代码生成",
};

export class PontLogger {
  log(message: string, logType = "info" as "info" | "error", stack?: any) {
    console.log(message, stack);
  }

  info(message: string) {
    this.log(message, "info");
  }

  error(errorSpec: PontLoggerSpec | string, stack?: any) {
    if (typeof errorSpec === "string") {
      this.log(errorSpec, "error", stack);
    } else if (errorSpec) {
      const originName = errorSpec.originName ? `[originName: ${errorSpec.originName}] ` : "";
      const processType = errorSpec.processType ? `[${processTypeNameMap[errorSpec.processType]}]` : "";

      this.log(`${originName}${processType}${errorSpec.message}`, "error", errorSpec.stack);
    }
  }
}
