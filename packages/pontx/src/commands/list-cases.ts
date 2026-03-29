import type { PontxManager } from "../manager";
import { PontxManager as PM } from "../manager";

/**
 * List cases command: show available code generation cases
 */
export async function listCasesCommand(manager: PontxManager) {
  const samples = await PM.listSamples(manager);

  const builtinCases = [
    { case: "request", description: "Basic HTTP request code" },
    { case: "reactHooks", description: "React Hooks style code" },
    { case: "cliCommand", description: "CLI shell command" },
  ];

  const projectCases = samples.map((sample) => ({
    case: sample.case,
    description: sample.description,
  }));

  // Filter out built-in cases that are overridden by project cases
  const projectCaseNames = new Set(projectCases.map((t) => t.case));
  const availableBuiltins = builtinCases.filter(
    (t) => !projectCaseNames.has(t.case)
  );

  if (projectCases.length > 0) {
    console.log("Project Cases:");
    projectCases.forEach((t) => {
      console.log(`  - ${t.case}: ${t.description}`);
    });
    console.log();
  }

  if (availableBuiltins.length > 0) {
    console.log("Built-in Cases:");
    availableBuiltins.forEach((t) => {
      console.log(`  - ${t.case}: ${t.description}`);
    });
  }

  if (projectCases.length === 0 && availableBuiltins.length === 0) {
    console.log("No cases available.");
  }
}
