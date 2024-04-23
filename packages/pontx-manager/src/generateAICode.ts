const encoding = require("encoding");
const fetch = require("node-fetch");
const util = require("util");
const stream = require("stream");

const TextDecoder = encoding.TextDecoder;

export type GenerateResponse = {
  code: string;
  codeAdded: string;
  errorMessage: string;
  isDone: boolean;
  isCancelled: boolean;
  isInputing: boolean;
  stop: () => void;
  next: () => Promise<GenerateResponse>;
};

const PONTX_PLATFORM_HOST = "https://www.pontxapi.com/";

export function createAICodeGenerator(
  promptId: string,
  projectName: string,
  variables: any,
  userPrompt: string,
  token: string,
): Promise<GenerateResponse> {
  if (!promptId || !projectName) {
    return;
  }
  let isInputing = false;
  let isCancelled = false;
  let stop = () => {
    isCancelled = true;
  };
  let code = "";
  let writtedCode = "";
  let hasConsumeStartQuote = false;

  const requestCode = async () => {
    isInputing = false;
    let response;

    try {
      response = await fetch(
        `${PONTX_PLATFORM_HOST}openapi/projects/${projectName}/prompt-word/${promptId}?token=${token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userPrompt,
            variables,
          }),
        },
      );
    } catch (e) {}

    if (response.status !== 200) {
      if (response.status === 404) {
        return {
          errorMessage: "请求接口 404",
          stop,
          code,
          codeAdded: "",
          isCancelled,
          isDone: true,
          isInputing: false,
          next: null,
        } as GenerateResponse;
      }
    }

    // Read the response as a stream of data
    const reader = stream.Readable.toWeb(response.body).getReader();
    const decoder = new global.TextDecoder("utf-8");

    isInputing = true;
    hasConsumeStartQuote = false;

    const next = async (): Promise<GenerateResponse> => {
      const { done, value } = await reader.read();

      if (done) {
        return {
          isDone: true,
          isInputing: false,
          stop,
          next,
          code,
          codeAdded: "",
          errorMessage: "",
          isCancelled,
        };
      }
      if (isCancelled) {
        return {
          isCancelled,
          isDone: true,
          isInputing: false,
          stop,
          next,
          code,
          codeAdded: "",
          errorMessage: "",
        };
      }
      // Massage and parse the chunk of data
      const deltaCode = decoder.decode(value);

      code = code + deltaCode;
      let codeAdded = deltaCode;

      if (!hasConsumeStartQuote) {
        codeAdded = "";
      }

      if (code.match(/```[a-zA-Z]+\n/)) {
        const [startCode] = code.match(/```[a-zA-Z]+\n/);
        const index = code.indexOf(startCode);
        code = code.slice(index + startCode.length);
        codeAdded = code;
        hasConsumeStartQuote = true;
      }

      if (hasConsumeStartQuote && code?.includes("```")) {
        const index = code.indexOf("```");
        code = code.slice(0, index)?.trim();

        if (codeAdded.includes("```")) {
          const endIndex = codeAdded.indexOf("```");
          codeAdded = codeAdded.slice(0, endIndex);
        }
      }

      const retValue = {
        stop,
        code,
        codeAdded,
        isCancelled: false,
        isDone: false,
        isInputing: true,
        next,
        errorMessage: "",
      } as GenerateResponse;

      if (code.includes("\n")) {
        if (!writtedCode) {
          // 代码首次可以写入
          writtedCode = code;
        } else {
          // 添加代码
        }
      } else {
        return {
          ...retValue,
          code: "",
        };
      }

      return retValue;
    };

    return {
      stop,
      code,
      codeAdded: "",
      isCancelled,
      isDone: false,
      isInputing: false,
      next,
    } as GenerateResponse;
  };

  return requestCode();
}

export async function listPrompts(projectName: string, token: string) {
  return fetch(`${PONTX_PLATFORM_HOST}openapi/projects/${projectName}/promptWords?token=${token}`).then(
    (res) => {
      return res.json();
    },
    (e) => {},
  );
}

export class GenerateAIOption {
  spec?: any;
  apiName?: string;
  controllerName?: string;
  specName?: string;
  specType: "api" | "struct" | "controller" | "spec";
  promptId: string;
  variables?: any;
  userPrompt?: string;
}

export type PromptWord = {
  /** 提示词内容 */
  content?: string;
  /** 提示词 ID */
  id?: string;
  /** 生成代码的语言 */
  language?: "typescript" | "javascript" | "sql" | "json" | "yaml" | "java" | "python";
  /** 提示词名称 */
  name?: string;
  /** 生成代码的类型，如前端代码，后端代码，SQL 代码，API 设计代码 */
  sceneType?: "pontx" | "sql" | "frontend" | "backend";
  /** 生成代码的对象, 例如API、数据结构、API分组、整个API系统 */
  target?: "struct" | "api" | "controller" | "spec";
  /** 提示词类型，内置或自定义 */
  type?: "built-in" | "custom";
  specName?: string;
};

export function listPromptsByOption(
  prompts: PromptWord[],
  option: GenerateAIOption,
  managerOptions: { languages: string[]; scenes: string[] },
): PromptWord[] {
  return (prompts || []).filter((prompt) => {
    let tag = true;

    if (option.specName) {
      tag = tag && prompt.specName === option.specName;
    }

    if (option.specType) {
      tag = tag && prompt.target === option.specType;
    }

    if (managerOptions.languages?.length) {
      tag = tag && managerOptions.languages.includes(prompt.language);
    }

    if (managerOptions.scenes?.length) {
      tag = tag && managerOptions.scenes.includes(prompt.sceneType);
    }

    return tag;
  });
}
