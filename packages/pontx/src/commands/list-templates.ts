import type { PontxManager } from "../manager";
import { PontxManager as PM } from "../manager";

/**
 * List templates command: show available code generation templates
 */
export async function listTemplatesCommand(manager: PontxManager) {
  const samples = await PM.listSamples(manager);

  const builtinTemplates = [
    { case: "request", description: "Basic HTTP request code" },
    { case: "reactHooks", description: "React Hooks style code" },
  ];

  const projectTemplates = samples.map((sample) => ({
    case: sample.case,
    description: sample.description,
  }));

  // Filter out built-in templates that are overridden by project templates
  const projectCases = new Set(projectTemplates.map((t) => t.case));
  const availableBuiltins = builtinTemplates.filter(
    (t) => !projectCases.has(t.case)
  );

  if (projectTemplates.length > 0) {
    console.log("Project Templates:");
    projectTemplates.forEach((t) => {
      console.log(`  - ${t.case}: ${t.description}`);
    });
    console.log();
  }

  if (availableBuiltins.length > 0) {
    console.log("Built-in Templates:");
    availableBuiltins.forEach((t) => {
      console.log(`  - ${t.case}: ${t.description}`);
    });
  }

  if (projectTemplates.length === 0 && availableBuiltins.length === 0) {
    console.log("No templates available.");
  }
}
