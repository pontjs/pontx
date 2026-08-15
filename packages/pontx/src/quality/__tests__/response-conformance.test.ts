/**
 * @author jasonHzq
 * @description 动态 fixture 成功响应与 Pontx Schema 一致性测试
 */

import { describe, expect, it } from "vitest";
import type { PontxAPI, PontxJsonSchema, PontxSpec } from "@pontx/spec";
import { validateFixtureResponse } from "../response-conformance";
import type { PontxEvalCase } from "../types";

function fixtures(schema: PontxJsonSchema, data: unknown): {
  spec: PontxSpec;
  api: PontxAPI;
  item: PontxEvalCase;
} {
  const api = {
    path: "/quote", method: "GET", responses: { "200": { schema } },
  } as PontxAPI;
  const item: PontxEvalCase = {
    id: "quote",
    task: "查询行情",
    expected: { api: "quotes/get", request: { method: "GET", path: "/quote" } },
    fixture: { status: 200, data },
  };
  const spec = {
    pontx: "2.1",
    style: "RESTFul",
    name: "quotes", apis: { "quotes/get": api }, components: { schemas: {} },
  } as PontxSpec;
  return { spec, api, item };
}

describe("validateFixtureResponse", () => {
  it("accepts a conforming enum response", () => {
    const input = fixtures({ type: "string", enum: ["PRE_MKT", "POST_MKT"] }, "POST_MKT");
    expect(validateFixtureResponse(input.spec, input.api, input.item)).toEqual([]);
  });

  it("reports an enum mismatch at a machine-readable fixture pointer", () => {
    const input = fixtures({ type: "string", enum: ["PRE_MKT", "POST_MKT"] }, "POST_MKT_PREV");
    expect(validateFixtureResponse(input.spec, input.api, input.item)).toContainEqual(expect.objectContaining({
      ruleId: "dynamic.response-schema-conformance",
      path: "eval:quote#/fixture/data",
      affectedApis: ["quotes/get"],
    }));
  });

  it("resolves local component refs", () => {
    const input = fixtures({ $ref: "#/components/schemas/Phase" } as PontxJsonSchema, "POST_MKT_PREV");
    input.spec.components!.schemas.Phase = { type: "string", enum: ["PRE_MKT", "POST_MKT"] };
    expect(validateFixtureResponse(input.spec, input.api, input.item)[0]).toMatchObject({
      path: "eval:quote#/fixture/data",
    });
  });

  it("validates array items and nested object fields", () => {
    const input = fixtures({
      type: "array",
      items: {
        type: "object", required: ["type"],
        properties: { type: { type: "string", enum: ["PRE_MKT", "POST_MKT"] } },
      },
    }, [{ type: "POST_MKT" }, { type: "POST_MKT_PREV" }, {}]);
    expect(validateFixtureResponse(input.spec, input.api, input.item)).toEqual([
      expect.objectContaining({ path: "eval:quote#/fixture/data/1/type" }),
      expect.objectContaining({ path: "eval:quote#/fixture/data/2/type" }),
    ]);
  });

  it("does not apply success-response validation to an error fixture", () => {
    const input = fixtures({ type: "string", enum: ["ok"] }, "error");
    input.item.fixture.status = 400;
    expect(validateFixtureResponse(input.spec, input.api, input.item)).toEqual([]);
  });
});
