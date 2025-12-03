import { addGlobalSpec } from "../../global";

/**
 * Add spec command: register a global spec package
 * @param packageNameOrPath npm package name or local path
 * @param options.force force overwrite existing registration
 */
export async function addSpecCommand(
  packageNameOrPath: string,
  options?: { force?: boolean }
) {
  try {
    const { packageName, specName } = await addGlobalSpec(packageNameOrPath, options);

    console.log(
      `✓ Registered global spec "${specName}" from ${packageName}`
    );
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : String(error)
    );
  }
}
