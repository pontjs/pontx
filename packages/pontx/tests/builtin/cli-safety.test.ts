import { describe, expect, it } from "vitest";
import type { ApiRequest } from "../../src/types";
import {
  MUTATION_CONFIRMATION_TTL_MS,
  createMutationConfirmation,
  isMutationMethod,
  redactBodyForPreview,
  redactForPreview,
  serializeCliResponse,
  verifyMutationConfirmation,
} from "../../src/builtin/cliSafety";

function request(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    url: "https://api.example.com/signatures",
    init: {
      method: "POST",
      headers: { Authorization: "Bearer secret", "Content-Type": "application/json" },
      body: JSON.stringify({ signer: "alice@example.com" }),
    },
    meta: {
      specName: "dropbox-sign",
      tagName: "signature-request",
      apiName: "send",
      method: "POST",
      path: "/signature_request/send",
    },
    ...overrides,
  };
}

describe("CLI mutation safety", () => {
  it("classifies safe and mutating methods", () => {
    expect(isMutationMethod("GET")).toBe(false);
    expect(isMutationMethod("head")).toBe(false);
    expect(isMutationMethod("POST")).toBe(true);
    expect(isMutationMethod("DELETE")).toBe(true);
  });

  it("binds a five-minute confirmation to the exact request", async () => {
    const now = 1_700_000_000_000;
    const original = request();
    const token = await createMutationConfirmation(original, now);

    expect(await verifyMutationConfirmation(original, token, now + 1)).toBe(true);
    expect(await verifyMutationConfirmation(request({
      init: { ...original.init, body: JSON.stringify({ signer: "mallory@example.com" }) },
    }), token, now + 1)).toBe(false);
    expect(await verifyMutationConfirmation(original, token, now + MUTATION_CONFIRMATION_TTL_MS + 1)).toBe(false);
  });

  it("binds multipart file content without exposing it", async () => {
    const form = new FormData();
    form.append("title", "agreement");
    form.append("file", new Blob(["signed bytes"], { type: "application/pdf" }), "agreement.pdf");
    const original = request({ init: { method: "POST", body: form } });
    const token = await createMutationConfirmation(original, 1000);

    expect(await verifyMutationConfirmation(original, token, 1001)).toBe(true);
  });

  it("redacts nested credential-like values", () => {
    expect(redactForPreview("", {
      apiKey: "secret",
      nested: { password: "secret", visible: "yes" },
    })).toEqual({
      apiKey: "<redacted>",
      nested: { password: "<redacted>", visible: "yes" },
    });
  });

  it("redacts exact product-specific preview fields without changing visible fields", () => {
    expect(redactForPreview("", {
      description: "private issue text",
      dom: { outerHTML: "<button>private</button>" },
      name: "visible project name",
    }, ["description", "dom"])).toEqual({
      description: "<redacted>",
      dom: "<redacted>",
      name: "visible project name",
    });
  });

  it("redacts credentials from form-encoded previews", () => {
    expect(redactBodyForPreview("api_key=secret&name=Alice"))
      .toBe("api_key=%3Credacted%3E&name=Alice");
  });

  it("applies product-specific redaction to JSON and form previews", () => {
    expect(redactBodyForPreview(JSON.stringify({ base64: "private bytes", name: "visible" }), ["base64"]))
      .toBe('{"base64":"<redacted>","name":"visible"}');
    expect(redactBodyForPreview("base64=private&name=visible", ["base64"]))
      .toBe("base64=%3Credacted%3E&name=visible");
  });

  it("preserves binary response bytes", async () => {
    const output = await serializeCliResponse(new Blob([new Uint8Array([0, 1, 255])]));
    expect(output.binary).toBe(true);
    expect(Array.from(output.data as Uint8Array)).toEqual([0, 1, 255]);
  });
});
