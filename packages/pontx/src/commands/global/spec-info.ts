import { getGlobalSpec } from "../../global";
import { resolveConfig } from "../../config";
import * as path from "path";

/**
 * Spec info command: show detailed information about a global spec
 * @param packageName npm package name
 */
export async function specInfoCommand(packageName: string) {
  try {
    const specEntry = await getGlobalSpec(packageName);

    if (!specEntry) {
      throw new Error(
        `Global spec package "${packageName}" not found. Run 'pontx global list-specs' to see available specs.`
      );
    }

    // Load the spec config to get URL and other details
    const configPath = path.join(specEntry.path, "pontx.config.ts");
    const resolvedConfig = await resolveConfig(configPath, {
      rootDir: specEntry.path,
      logLevel: "silent",
    });

    const origin = resolvedConfig.origins[0]; // We know there's only one

    // Format the output
    console.log(`Package:     ${packageName}`);
    console.log(`Spec Name:   ${specEntry.specName}`);
    console.log(`Path:        ${specEntry.path}`);

    if (specEntry.registeredAt) {
      // Format date: 2024-01-15 10:30:00
      const date = new Date(specEntry.registeredAt);
      const formatted = date
        .toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(/(\d+)\/(\d+)\/(\d+),/, "$3-$1-$2");
      console.log(`Registered:  ${formatted}`);
    }

    if (origin.url) {
      console.log(`URL:         ${origin.url}`);
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}
