/**
 * @author jasonHzq
 * @description PontxSpec 静态质量评分与边界规则测试
 */

import { describe, expect, it } from "vitest";
import type { PontxSpec } from "../../src/spec";
import { evaluatePontxQuality } from "../../src/quality/evaluator";
import { QualityGrade } from "../../src/quality/types";

function goodSpec(): PontxSpec {
  return {
    name: "users",
    info: { title: "用户 API", description: "用户查询服务" },
    servers: [{ url: "https://api.example.com" }],
    tags: [{ name: "users", description: "用户管理" }],
    security: [{ apiKey: [] }],
    components: {
      securitySchemes: { apiKey: { type: "apiKey", name: "X-API-Key", in: "header" } },
      schemas: {
        User: {
          type: "object",
          title: "用户",
          description: "用户详情",
          required: ["id", "name"],
          properties: {
            id: { type: "string", description: "用户 ID", examples: ["u-1"] },
            name: { type: "string", description: "用户名", examples: ["Alice"] },
          },
        },
      },
    },
    apis: {
      "users/getUser": {
        path: "/users/{id}", method: "GET", title: "查询用户", description: "按 ID 查询用户",
        parameters: [{
          name: "id", in: "path", required: true,
          schema: { type: "string", description: "用户 ID", examples: ["u-1"] },
        }],
        responses: {
          "200": { description: "用户详情", schema: { type: "object", $ref: "#/components/schemas/User" } },
          default: { description: "请求错误" },
        },
        security: [{ apiKey: [] }],
      },
    },
  } as PontxSpec;
}

describe("evaluatePontxQuality", () => {
  it("gives a complete PontxSpec the full static score", () => {
    const report = evaluatePontxQuality({ spec: goodSpec() });
    expect(report.staticScore).toBe(50);
    expect(report.score).toBe(100);
    expect(report.grade).toBe(QualityGrade.A);
    expect(report.findings).toEqual([]);
  });

  it("does not require examples on complex containers but requires leaf examples", () => {
    const spec = goodSpec();
    delete spec.components!.schemas.User.properties!.name.examples;
    spec.components!.schemas.User.properties!.name.default = "fallback";
    spec.components!.schemas.User.properties!.name.enum = ["Alice"];
    spec.components!.schemas.User.properties!.name.enumValueTitles = { Alice: "爱丽丝" };
    const report = evaluatePontxQuality({ spec });
    const exampleFindings = report.findings.filter((finding) => finding.ruleId === "examples.leaf");
    expect(exampleFindings).toHaveLength(1);
    expect(exampleFindings[0].path).toContain("properties[\"name\"].examples");
    expect(report.findings.some((finding) => finding.path.endsWith("User.examples"))).toBe(false);
  });

  it("marks path parameter mismatches as critical", () => {
    const spec = goodSpec();
    spec.apis["users/getUser"].parameters![0].name = "userId";
    const report = evaluatePontxQuality({ spec });
    expect(report.criticals.some((finding) => finding.ruleId === "contract.path-parameters")).toBe(true);
    expect(report.grade).toBe(QualityGrade.D);
  });

  it("rejects examples that violate type and range constraints", () => {
    const spec = goodSpec();
    spec.components!.schemas.User.properties!.id.minLength = 3;
    spec.components!.schemas.User.properties!.id.examples = [1];
    const report = evaluatePontxQuality({ spec });
    expect(report.findings.some((finding) => finding.ruleId === "examples.valid")).toBe(true);
  });

  it("detects locale structural drift and missing prose", () => {
    const source = goodSpec();
    const localized = structuredClone(source);
    localized.apis["users/getUser"].method = "POST";
    delete localized.apis["users/getUser"].description;
    const report = evaluatePontxQuality({ spec: source, locales: { "en-US": localized } });
    expect(report.findings.some((finding) => finding.ruleId === "i18n.structure")).toBe(true);
    expect(report.findings.some((finding) => finding.ruleId === "i18n.prose")).toBe(true);
  });

  it("reports a non-PontxSpec input as Invalid", () => {
    const report = evaluatePontxQuality({ spec: {} as PontxSpec });
    expect(report.grade).toBe(QualityGrade.Invalid);
    expect(report.score).toBeNull();
  });
});
