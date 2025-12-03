import { removeGlobalSpec } from "../../global";

/**
 * Remove spec command: unregister a global spec
 * @param packageName npm package name
 */
export async function removeSpecCommand(packageName: string) {
  try {
    await removeGlobalSpec(packageName);

    console.log(`✓ Removed global spec "${packageName}"`);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : String(error));
  }
}
