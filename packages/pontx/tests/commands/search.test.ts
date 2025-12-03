/**
 * Tests for search.ts pure functions
 */

import { describe, it, expect } from "vitest";
import Fuse from "fuse.js";
import { quoteIfNeeded, searchApis, buildFuse } from "../../src/commands/search";

describe("quoteIfNeeded", () => {
  it("should return name unchanged if no special characters", () => {
    expect(quoteIfNeeded("getUserById")).toBe("getUserById");
    expect(quoteIfNeeded("petstore")).toBe("petstore");
  });

  it("should wrap name in quotes if contains dot", () => {
    expect(quoteIfNeeded("user.service")).toBe('"user.service"');
    expect(quoteIfNeeded("api.v2.users")).toBe('"api.v2.users"');
  });

  it("should handle empty string", () => {
    expect(quoteIfNeeded("")).toBe("");
  });

  it("should handle name starting with dot", () => {
    expect(quoteIfNeeded(".hidden")).toBe('".hidden"');
  });

  it("should handle name ending with dot", () => {
    expect(quoteIfNeeded("config.")).toBe('"config."');
  });
});

describe("searchApis", () => {
  // Create a mock Fuse instance with test data
  const createMockFuse = () => {
    const testData = [
      {
        name: "getUserById",
        tagName: "user",
        specName: "petstore",
        title: "Get user by ID",
        description: "Retrieves a user by their unique identifier",
        summary: "Get user",
        method: "GET",
        path: "/users/{id}",
        params: "id (path) string User ID",
      },
      {
        name: "createUser",
        tagName: "user",
        specName: "petstore",
        title: "Create new user",
        description: "Creates a new user in the system",
        summary: "Create user",
        method: "POST",
        path: "/users",
        params: "body (body) object User data",
      },
      {
        name: "getPetById",
        tagName: "pet",
        specName: "petstore",
        title: "Get pet by ID",
        description: "Returns a single pet",
        summary: "Find pet by ID",
        method: "GET",
        path: "/pets/{petId}",
        params: "petId (path) integer Pet ID",
      },
      {
        name: "deletePet",
        tagName: "pet",
        specName: "petstore",
        title: "Delete a pet",
        description: "Deletes a pet from the store",
        summary: "Delete pet",
        method: "DELETE",
        path: "/pets/{petId}",
        params: "petId (path) integer Pet ID",
      },
    ];

    return new Fuse(testData, {
      keys: [
        { name: "name", weight: 3 },
        "tagName",
        "specName",
        "title",
        "description",
        "summary",
        "method",
        "path",
        "params",
      ],
      shouldSort: true,
      includeScore: true,
      includeMatches: true,
      ignoreLocation: true,
      threshold: 0.7,
    });
  };

  it("should return matching APIs for keyword", () => {
    const fuse = createMockFuse();
    const results = searchApis("user", fuse);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.apiName === "getUserById")).toBe(true);
    expect(results.some((r) => r.apiName === "createUser")).toBe(true);
  });

  it("should respect maxCount parameter", () => {
    const fuse = createMockFuse();
    const results = searchApis("pet", fuse, 1);

    expect(results.length).toBe(1);
  });

  it("should use default maxCount of 6", () => {
    const fuse = createMockFuse();
    const results = searchApis("a", fuse);

    expect(results.length).toBeLessThanOrEqual(6);
  });

  it("should return correct result structure", () => {
    const fuse = createMockFuse();
    const results = searchApis("getUserById", fuse);

    expect(results.length).toBeGreaterThan(0);
    const result = results[0];

    expect(result).toHaveProperty("tagName");
    expect(result).toHaveProperty("specName");
    expect(result).toHaveProperty("apiName");
    expect(result).toHaveProperty("method");
    expect(result).toHaveProperty("path");
    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("description");
  });

  it("should return empty array for no matches", () => {
    const fuse = createMockFuse();
    const results = searchApis("xyznonexistent123", fuse);

    expect(results).toEqual([]);
  });

  it("should search by path", () => {
    const fuse = createMockFuse();
    const results = searchApis("/pets", fuse);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path.includes("/pets"))).toBe(true);
  });

  it("should search by HTTP method", () => {
    const fuse = createMockFuse();
    const results = searchApis("DELETE", fuse);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.method === "DELETE")).toBe(true);
  });
});
