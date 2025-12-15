import { listGlobalSpecs } from "../../global";

/**
 * List specs command: show all registered global specs
 */
export async function listSpecsCommand() {
  try {
    const specs = await listGlobalSpecs();

    if (specs.length === 0) {
      console.log("No global specs registered.");
      return;
    }

    console.log("Global Specs:\n");

    // Calculate column widths
    const packageMaxLen = Math.max(
      "PACKAGE".length,
      ...specs.map((s) => s.packageName.length)
    );
    const specNameMaxLen = Math.max(
      "SPEC NAME".length,
      ...specs.map((s) => s.entry.specName.length)
    );

    // Print header
    console.log(
      `  ${"PACKAGE".padEnd(packageMaxLen)}  ${"SPEC NAME".padEnd(
        specNameMaxLen
      )}  PATH`
    );

    // Print specs
    specs.forEach(({ packageName, entry }) => {
      console.log(
        `  ${packageName.padEnd(packageMaxLen)}  ${entry.specName.padEnd(
          specNameMaxLen
        )}  ${entry.path}`
      );
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}
