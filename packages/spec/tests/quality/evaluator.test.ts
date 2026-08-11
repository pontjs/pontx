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

  it("accepts nullable examples and traverses composition branches", () => {
    const spec = goodSpec();
    spec.components!.schemas.NullableName = {
      type: "string", description: "可空名称", examples: [null], nullable: true,
    } as any;
    spec.components!.schemas.ComposedUser = {
      description: "组合用户",
      allOf: [{ $ref: "#/components/schemas/User" }],
    } as any;
    const report = evaluatePontxQuality({ spec });
    expect(report.findings.some((finding) => finding.path.includes("NullableName")
      && finding.ruleId === "examples.valid")).toBe(false);
    expect(report.findings.some((finding) => finding.path.includes("ComposedUser.type")
      && finding.ruleId === "structure.schema-type")).toBe(false);
  });

  it("accepts a described referenced Schema as the parameter description", () => {
    const spec = goodSpec();
    spec.apis["users/getUser"].parameters = [{
      name: "body", in: "body", required: true,
      schema: { $ref: "#/components/schemas/User" } as any,
    }];
    spec.apis["users/getUser"].path = "/users";
    const report = evaluatePontxQuality({ spec });
    expect(report.findings.some((finding) => finding.ruleId === "description.parameter")).toBe(false);
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

  it("treats enum extension text and OAuth scopes as localizable prose", () => {
    const source = goodSpec();
    const localized = structuredClone(source);
    (source.components!.schemas.User.properties!.id as any)["x-enum-descriptions"] = ["标识"];
    (localized.components!.schemas.User.properties!.id as any)["x-enum-descriptions"] = ["Identifier"];
    (source.components!.securitySchemes!.apiKey as any).scopes = { read: "读取" };
    (localized.components!.securitySchemes!.apiKey as any).scopes = { read: "Read" };
    const report = evaluatePontxQuality({ spec: source, locales: { "en-US": localized } });
    expect(report.findings.some((finding) => finding.ruleId === "i18n.structure")).toBe(false);
    expect(report.findings.some((finding) => finding.ruleId === "i18n.prose")).toBe(false);
  });

  it("reports a non-PontxSpec input as Invalid", () => {
    const report = evaluatePontxQuality({ spec: {} as PontxSpec });
    expect(report.grade).toBe(QualityGrade.Invalid);
    expect(report.score).toBeNull();
  });
});
