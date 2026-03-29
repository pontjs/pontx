/**
 * @author jasonHzq
 * @description Spec 作用域命令：列举代码生成 case
 */

import type { PontxManager } from "../../../manager";
import type { CliContext } from "../../context";
import { PontxManager as PM } from "../../../manager";

/**
 * List cases command: show available code generation cases
 */
export async function listCasesCommand(ctx: CliContext) {
  const manager = await ctx.getManager();
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
