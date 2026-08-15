/**
 * @author jasonHzq
 * @description 确定性请求构造、Agent 动态评分与报告合并测试
 */

import { describe, expect, it } from "vitest";
import {
  evaluatePontxQuality,
  PontxRequestInputLocation,
  PontxRequestInputSourceKind,
  type PontxSpec,
} from "@pontx/spec";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { CodexAgentAdapter } from "../codex-adapter";
import { validatePontxCliCompatibility } from "../deterministic";
import { mergeEvaluationReport, runDynamicEvaluation } from "../runner";
import { EvalAttribution, type AgentAdapter, type PontxEvalCase } from "../types";

function specFixture(): PontxSpec {
  return {
    pontx: "2.1",
    style: "RESTFul",
    name: "pets",
    info: { title: "宠物 API", description: "宠物查询服务" },
    servers: [{ url: "https://api.example.com" }],
    tags: [{ name: "pets", description: "宠物" }],
    components: { schemas: {} },
    apis: {
      "pets/getPet": {
        path: "/pets/{id}", method: "GET", operationId: "getPet",
        title: "查询宠物", description: "按 ID 查询宠物",
        parameters: [{
          name: "id", in: "path", required: true,
          schema: { type: "string", description: "宠物 ID", examples: ["p-1"] },
        }],
        responses: {
          "200": {
            description: "宠物详情",
            schema: {
              type: "object", description: "宠物",
              properties: { name: { type: "string", description: "名称", examples: ["Milo"] } },
            },
          },
          default: { description: "请求错误" },
        },
        requestExamples: {
          default: {
            request: { path: { id: "p-1" }, query: {}, headers: {} },
            expectedStatus: "200",
          },
        },
      },
    },
  } as PontxSpec;
}

const evalCase: PontxEvalCase = {
  id: "get-pet",
  task: "查询 p-1 的宠物名称",
  expected: {
    api: "pets/getPet",
    request: { method: "GET", path: "/pets/p-1" },
    answerContains: ["Milo"],
  },
  fixture: { data: { name: "Milo" } },
};

describe("quality dynamic runner", () => {
  it("builds requests for every API from required leaf examples", async () => {
    const result = await validatePontxCliCompatibility(specFixture());
    expect(result.coverage).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it("reports required parameters that cannot be generated", async () => {
    const spec = specFixture();
    delete spec.apis["pets/getPet"].parameters![0].schema.examples;
    delete spec.apis["pets/getPet"].requestExamples;
    const result = await validatePontxCliCompatibility(spec);
    expect(result.coverage).toBe(0);
    expect(result.findings[0].ruleId).toBe("deterministic.required-examples");
  });

  it("builds path, query, header, and body inputs from a complete request example", async () => {
    const spec = specFixture();
    spec.apis["pets/getPet"].method = "POST";
    spec.apis["pets/getPet"].parameters = [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
      { name: "expand", in: "query", required: true, schema: { type: "boolean" } },
      { name: "x-trace", in: "header", required: true, schema: { type: "string" } },
      {
        name: "body", in: "body", required: true,
        schema: {
          type: "object", required: ["name"],
          properties: { name: { type: "string" } },
        },
      },
    ];
    spec.apis["pets/getPet"].requestExamples = {
      default: {
        request: {
          path: { id: "p-from-request-example" },
          query: { expand: true },
          headers: { "x-trace": "trace-1" },
          body: { name: "Milo" },
        },
        expectedStatus: "200",
      },
    };

    const result = await validatePontxCliCompatibility(spec);

    expect(result.coverage).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it("counts a validated operation dependency as deterministically resolved", async () => {
    const spec = specFixture();
    delete spec.apis["pets/getPet"].parameters![0].schema.examples;
    spec.apis["pets/listPets"] = {
      path: "/pets", method: "GET", operationId: "listPets",
      parameters: [], responses: { "200": { description: "宠物列表" } },
    };
    spec.apis["pets/getPet"].requestExamples = {
      default: {
        request: {}, expectedStatus: "200",
        unresolved: [{
          in: PontxRequestInputLocation.Path, name: "id",
          source: { kind: PontxRequestInputSourceKind.Operation, operationId: "listPets" },
        }],
      },
    };

    const result = await validatePontxCliCompatibility(spec);

    expect(result.coverage).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it.each([
    {
      name: "a dependency without a source",
      unresolved: [{ in: "path", name: "id" }],
    },
    {
      name: "a dependency on an unknown operation",
      unresolved: [{
        in: "path", name: "id",
        source: { kind: "operation", operationId: "missingOperation" },
      }],
    },
    {
      name: "an example that does not cover the required input",
      unresolved: [],
    },
  ])("rejects $name", async ({ unresolved }) => {
    const spec = specFixture();
    delete spec.apis["pets/getPet"].parameters![0].schema.examples;
    spec.apis["pets/getPet"].requestExamples = {
      default: { request: {}, expectedStatus: "200", unresolved } as any,
    };

    const result = await validatePontxCliCompatibility(spec);

    expect(result.coverage).toBe(0);
    expect(result.findings).toContainEqual(expect.objectContaining({
      ruleId: "deterministic.required-examples",
      affectedApis: ["pets/getPet"],
    }));
  });

  it("builds required request bodies composed with allOf", async () => {
    const spec = specFixture();
    spec.components!.schemas.PetInput = {
      type: "object", description: "宠物输入", required: ["name"],
      properties: { name: { type: "string", description: "名称", examples: ["Milo"] } },
    };
    spec.apis["pets/getPet"].parameters = [{
      name: "body", in: "body", required: true,
      schema: {
        description: "组合输入",
        allOf: [
          { $ref: "#/components/schemas/PetInput" },
          { type: "object", required: ["name"] },
        ],
      } as any,
    }];
    spec.apis["pets/getPet"].path = "/pets";
    const result = await validatePontxCliCompatibility(spec);
    expect(result.coverage).toBe(1);
    expect(result.findings).toEqual([]);
  });

  it("scores a safe successful Agent trace and merges a 100 point report", async () => {
    const adapter: AgentAdapter = {
      name: "fake",
      async run() {
        return {
          exitCode: 0,
          timedOut: false,
          stdout: "show-api pets getPet\nDry run - request not sent\ncase-get-pet-marker",
          stderr: "",
          finalText: "宠物名称是 Milo",
          commandCount: 3,
        };
      },
    };
    const spec = specFixture();
    const dynamic = await runDynamicEvaluation({
      spec, specPath: "/tmp/pontx-spec.json", cases: [evalCase], adapter, runsPerCase: 3,
    });
    expect(dynamic.score).toBe(50);
    expect(dynamic.caseResults[0].passed).toBe(true);
    const merged = mergeEvaluationReport(evaluatePontxQuality({ spec }), dynamic);
    expect(merged.score).toBe(100);
    expect(merged.provisional).toBe(false);
  });

  it("rejects a successful fixture response outside the declared enum", async () => {
    const spec = specFixture();
    spec.apis["pets/getPet"].responses["200"].schema = {
      type: "object",
      properties: {
        phase: { type: "string", enum: ["PRE_MKT", "POST_MKT"] },
      },
    };
    const invalidCase = structuredClone(evalCase);
    invalidCase.fixture.data = { phase: "POST_MKT_PREV" };
    const adapter: AgentAdapter = {
      name: "fake",
      async run() {
        return {
          exitCode: 0, timedOut: false, stderr: "", commandCount: 3,
          stdout: "show-api pets getPet\nDry run - request not sent\ncase-get-pet-marker",
          finalText: "宠物名称是 Milo",
        };
      },
    };
    const dynamic = await runDynamicEvaluation({
      spec, specPath: "/tmp/pontx-spec.json", cases: [invalidCase], adapter,
    });
    expect(dynamic.score).toBe(35);
    expect(dynamic.caseResults[0].passed).toBe(false);
    expect(dynamic.caseResults[0].attribution).toBe(EvalAttribution.MetadataOrContract);
    expect(dynamic.caseResults[0].findings).toContainEqual(expect.objectContaining({
      ruleId: "dynamic.response-schema-conformance",
      path: "eval:get-pet#/fixture/data/phase",
    }));
  });

  it("uses raw PontxSpec only to attribute CLI discovery failures", async () => {
    const adapter: AgentAdapter = {
      name: "diagnostic-fake",
      async run(input) {
        return {
          exitCode: 0, timedOut: false, stderr: "", commandCount: 2,
          stdout: input.exposeRawSpec
            ? "Dry run - request not sent\ncase-get-pet-diagnostic"
            : "search pets",
          finalText: input.exposeRawSpec ? "宠物名称是 Milo" : "没有找到",
        };
      },
    };
    const dynamic = await runDynamicEvaluation({
      spec: specFixture(), specPath: "/tmp/pontx-spec.json", cases: [evalCase], adapter,
    });
    expect(dynamic.caseResults[0].attribution).toBe(EvalAttribution.CliDiscovery);
    expect(dynamic.caseResults[0].score).toBeLessThan(40);
  });

  it("classifies a golden API missing from PontxSpec without running the Agent", async () => {
    const missingCase = structuredClone(evalCase);
    missingCase.expected.api = "pets/missing";
    const adapter: AgentAdapter = {
      name: "must-not-run",
      async run() { throw new Error("Agent should not run"); },
    };
    const dynamic = await runDynamicEvaluation({
      spec: specFixture(), specPath: "/tmp/pontx-spec.json", cases: [missingCase], adapter,
    });
    expect(dynamic.caseResults[0].attribution).toBe(EvalAttribution.MetadataOrContract);
    expect(dynamic.caseResults[0].attempts).toBe(0);
    expect(dynamic.caseResults[0].findings[0].ruleId).toBe("dynamic.expected-api-missing");
  });

  it("runs the real Pontx CLI against an isolated executeApi fixture", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "pontx-quality-test-"));
    const specPath = path.join(tempDir, "spec.json");
    const fakeCodex = path.join(tempDir, "fake-codex.mjs");
    await fs.writeFile(specPath, JSON.stringify(specFixture()), "utf-8");
    await fs.writeFile(fakeCodex, `#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
if (!process.argv.includes("--skip-git-repo-check")) process.exit(64);
if (process.argv[process.argv.indexOf("--sandbox") + 1] !== "read-only") process.exit(65);
if (!existsSync("node_modules/.pontx-cache")) process.exit(66);
await new Promise((resolve) => {
  process.stdin.resume();
  process.stdin.once("end", resolve);
});
const prompt = process.argv.at(-1);
const cli = prompt.match(/CLI 命令前缀：(.+)/)[1];
const commands = [
  cli + " show-api pets getPet",
  cli + " call pets getPet --id p-1 --dry-run",
  cli + " call pets getPet --id p-1"
];
for (const command of commands) {
  const result = spawnSync("/bin/sh", ["-lc", command], { cwd: process.cwd(), encoding: "utf-8" });
  const output = (result.stdout || "") + (result.stderr || "");
  process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "command_execution", text: command, aggregated_output: output } }) + "\\n");
  if (result.status !== 0) process.exit(result.status || 1);
}
process.stdout.write(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "宠物名称是 Milo" } }) + "\\n");
`, "utf-8");
    await fs.chmod(fakeCodex, 0o755);
    try {
      const output = await new CodexAgentAdapter({ binary: fakeCodex }).run({
        case: evalCase, specPath, specName: "pets", timeoutMs: 60_000,
      });
      expect(output.exitCode, `${output.stdout}\n${output.stderr}`).toBe(0);
      expect(output.stdout).toMatch(/case-get-pet-/);
      expect(output.stdout).toContain("Dry run - request not sent");
      expect(output.finalText).toContain("Milo");
      expect(output.commandCount).toBe(3);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }, 70_000);
});
