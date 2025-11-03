/**
 * Graceful Client Plugin for Pontx
 *
 * This plugin enhances code generation to support graceful client features.
 *
 * @example
 * ```typescript
 * // pontx.config.ts
 * import { gracefulCodegenPlugin } from '@pontx/nodejs-sdk/plugin'
 *
 * export default {
 *   plugins: [gracefulCodegenPlugin()],
 *   origins: [...]
 * }
 * ```
 */

import { PontxSpec, generateSchemas } from "@pontx/spec";
import {
  generateGracefulApiMeta,
  generateGracefulApis,
} from "./graceful-codegen";
import { getBuiltinPlugin } from "pontx";

/**
 * Plugin interface compatible with Pontx plugin system
 */
interface Plugin {
  name: string;
  generate?: (
    spec: PontxSpec,
    options?: any
  ) => Promise<Record<string, string>>;
}

/**
 * Create graceful codegen plugin
 *
 * This plugin generates enhanced apiMeta.ts and apis.ts files with:
 * - pathParams: string[] - Path parameter names
 * - queryParams: string[] - Query parameter names
 * - bodyType: 'object' | 'array' | ... - Body type for signature selection
 * - consume: string - Content-Type in API types
 *
 * @returns Pontx plugin instance
 */
export function gracefulCodegenPlugin(): Plugin {
  return {
    name: "graceful-codegen-plugin",

    /**
     * Generate enhanced code files
     */
    generate: async (spec: PontxSpec, options) => {
      const originalFileStructure = await getBuiltinPlugin().generate(
        spec,
        options
      );

      const fileStructure: Record<string, string> = {
        ...originalFileStructure,

        // Enhanced API types with consume field
        "apis.ts": generateGracefulApis(spec),

        // Enhanced API metadata with pathParams, queryParams, bodyType
        "apiMeta.ts": generateGracefulApiMeta(spec),
      };

      return fileStructure;
    },
  };
}
