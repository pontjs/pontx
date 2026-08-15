import { expect, test } from "vitest";
import { parseOAS3 } from "../src/index";

test("parseOAS3 public entrypoint", () => {
  const spec = parseOAS3({
    openapi: "3.0.3",
    info: { title: "Fixture", version: "1.0.0" },
    paths: {
      "/health": {
        get: {
          operationId: "getHealth",
          responses: { "200": { description: "ok" } }
        }
      }
    }
  }, "api-meta-v2");

  expect(spec.apis.getHealth.operationId).toBe("getHealth");
});
