import { compileTemplate } from "../../src/parse/compiler";
import { describe, it, expect } from "vitest";

describe("compileTemplate", () => {
  it("should compile template", () => {
    const template = "#/definitions/Map«string,List«string»»";
    const result = compileTemplate(template, "#/definitions/");

    expect(result.name).toEqual("Map");
  });
});
