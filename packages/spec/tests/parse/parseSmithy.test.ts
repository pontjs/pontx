/**
 * @author jasonHzq
 * @description Smithy RPC 导入测试。
 */

import { describe, expect, it } from "vitest";
import { importSmithy, loadPontxSpec } from "../../src/index";

const source = {
  smithy: "2.0",
  shapes: {
    "example.queue#QueueService": {
      type: "service",
      version: "2026-08-15",
      operations: [{ target: "example.queue#SendMessage" }],
      traits: {
        "aws.protocols#awsQueryCompatible": {},
        "aws.auth#sigv4": { name: "queue" },
        "smithy.rules#endpointRuleSet": { version: "1.0", rules: [] },
        "smithy.api#documentation": "Queue service.",
      },
    },
    "example.queue#SendMessage": {
      type: "operation",
      input: { target: "example.queue#SendMessageInput" },
      output: { target: "example.queue#SendMessageOutput" },
      errors: [{ target: "example.queue#InvalidMessage" }],
      traits: { "smithy.api#documentation": "Sends one message." },
    },
    "example.queue#SendMessageInput": {
      type: "structure",
      members: {
        MessageBody: {
          target: "smithy.api#String",
          traits: { "smithy.api#required": {} },
        },
        Attributes: { target: "example.queue#Attributes" },
      },
    },
    "example.queue#Attributes": {
      type: "map",
      key: { target: "smithy.api#String" },
      value: { target: "smithy.api#String" },
    },
    "example.queue#SendMessageOutput": {
      type: "structure",
      members: { MessageId: { target: "smithy.api#String" } },
    },
    "example.queue#InvalidMessage": {
      type: "structure",
      members: { message: { target: "smithy.api#String" } },
    },
  },
};

describe("importSmithy", () => {
  it("imports AWS Query actions as RPC without inventing REST paths", () => {
    const spec = importSmithy(source, { name: "example-queue", tagName: "queue" });
    const api = spec.apis["queue/SendMessage"];

    expect(loadPontxSpec(spec, { expectedName: "example-queue" })).toBe(spec);
    expect(spec.style).toBe("RPC");
    expect(spec.rpc).toEqual({
      protocol: "aws-query",
      version: "2026-08-15",
      signing: { scheme: "aws-sigv4", service: "queue" },
      endpointRuleSet: { version: "1.0", rules: [] },
    });
    expect(api.path).toBeUndefined();
    expect(api.method).toBeUndefined();
    expect(api.rpc).toEqual({
      action: "SendMessage",
      method: "POST",
      contentType: "application/x-www-form-urlencoded",
    });
    expect(api.parameters?.[0].schema.genericRef?.$ref)
      .toBe("#/components/schemas/SendMessageInput");
    expect(api.responses.success.schema?.genericRef?.$ref)
      .toBe("#/components/schemas/SendMessageOutput");
    expect(api.responses.error.schema?.oneOf?.[0].genericRef?.$ref)
      .toBe("#/components/schemas/InvalidMessage");
    expect(spec.components?.schemas.SendMessageInput.required).toEqual(["MessageBody"]);
    expect(spec.components?.schemas.Attributes.additionalProperties?.type).toBe("string");
  });

  it("requires a protocol when the service declares none", () => {
    const withoutProtocol = structuredClone(source);
    delete withoutProtocol.shapes["example.queue#QueueService"].traits["aws.protocols#awsQueryCompatible"];

    expect(() => importSmithy(withoutProtocol, { name: "example-queue" }))
      .toThrow("does not declare a supported protocol");
  });

  it("requires RPC protocol and action fields in loaded contracts", () => {
    expect(() => loadPontxSpec({
      pontx: "2.1",
      style: "RPC",
      name: "broken-rpc",
      apis: { invoke: { responses: {} } },
      components: { schemas: {} },
    })).toThrow("RPC 契约必须声明稳定的 rpc.protocol");
  });
});
