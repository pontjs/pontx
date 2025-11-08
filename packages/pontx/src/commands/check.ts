import { createLogger } from "../logger";
import type { CheckResult } from "../type";
import type { PontxManager } from "../manager";

/**
 * Check command: validate compatibility between local and remote metadata
 */
export async function checkCommand(manager: PontxManager) {
  const logger = createLogger("info", { prefix: "[pontx check]" });

  logger.info("Starting metadata check...");

  const config = manager.resolvedConfig;
  const plugin = config.resolvedPlugin;

  let hasErrors = false;

  // Check each origin
  for (const origin of config.origins) {
    console.log(`\n🔍 Checking ${origin.name}...`);

    const pluginOptions = {
      originConfig: origin,
      resolvedConfig: config,
    };

    try {
      // Use localSpec (from pontx-lock.json) and remoteSpec (fetched by manager)
      const localSpec = origin.spec || null;
      const remoteSpec = origin.remoteSpec;

      if (!remoteSpec) {
        logger.error(`Failed to fetch remote metadata for ${origin.name}`);
        hasErrors = true;
        continue;
      }

      // Execute check
      if (!plugin.check) {
        console.log("⚠️  No check plugin configured");
        continue;
      }

      const results = await plugin.check(localSpec, remoteSpec, pluginOptions);

      // Output results
      if (results.length === 0) {
        console.log("✅ No issues found");
      } else {
        const errors = results.filter((r) => r.level === "error");
        const warnings = results.filter((r) => r.level === "warning");
        const infos = results.filter((r) => r.level === "info");

        if (errors.length > 0) {
          console.log(`\n❌ ${errors.length} error(s) found:`);
          errors.forEach((err) => {
            printCheckResult(err);
          });
          hasErrors = true;
        }

        if (warnings.length > 0) {
          console.log(`\n⚠️  ${warnings.length} warning(s) found:`);
          warnings.forEach((warn) => {
            printCheckResult(warn);
          });
        }

        if (infos.length > 0) {
          console.log(`\nℹ️  ${infos.length} info(s):`);
          infos.forEach((info) => {
            printCheckResult(info);
          });
        }
      }
    } catch (error) {
      logger.error(
        `Failed to check ${origin.name}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      hasErrors = true;
    }
  }

  // Exit with appropriate code
  if (hasErrors) {
    console.log("\n❌ Check failed with errors");
    process.exit(1);
  } else {
    console.log("\n✅ All checks passed");
    process.exit(0);
  }
}

/**
 * Print a single check result
 */
function printCheckResult(result: CheckResult) {
  console.log(`  [${result.type}] ${result.message}`);
  if (result.api) {
    const apiInfo = [];
    if (result.api.method && result.api.path) {
      apiInfo.push(`${result.api.method} ${result.api.path}`);
    }
    if (result.api.tagName && result.api.apiName) {
      apiInfo.push(`${result.api.tagName}.${result.api.apiName}`);
    } else if (result.api.apiName) {
      apiInfo.push(result.api.apiName);
    }
    if (apiInfo.length > 0) {
      console.log(`    ${apiInfo.join(" | ")}`);
    }
  }
  if (result.details) {
    console.log(`    Details: ${JSON.stringify(result.details, null, 2)}`);
  }
}
