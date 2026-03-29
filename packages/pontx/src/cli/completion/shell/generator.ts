/**
 * Shell Script Generator
 *
 * Generates shell completion scripts for different shells.
 */

import { ShellScriptOptions, ShellType } from "../types";
import { bashTemplate, bashInstallInstructions } from "./bash";
import { zshTemplate, zshInstallInstructions } from "./zsh";
import { fishTemplate, fishInstallInstructions } from "./fish";

export class ShellCompletionGenerator {
  /**
   * Generate completion script for specified shell
   */
  generate(shell: ShellType, options: ShellScriptOptions): string {
    switch (shell) {
      case "bash":
        return bashTemplate(options);
      case "zsh":
        return zshTemplate(options);
      case "fish":
        return fishTemplate(options);
      default:
        throw new Error(`Unsupported shell: ${shell}`);
    }
  }

  /**
   * Generate Bash completion script
   */
  generateBash(options: ShellScriptOptions): string {
    return bashTemplate(options);
  }

  /**
   * Generate Zsh completion script
   */
  generateZsh(options: ShellScriptOptions): string {
    return zshTemplate(options);
  }

  /**
   * Generate Fish completion script
   */
  generateFish(options: ShellScriptOptions): string {
    return fishTemplate(options);
  }

  /**
   * Get installation instructions for specified shell
   */
  getInstallInstructions(shell: ShellType, binName: string): string {
    switch (shell) {
      case "bash":
        return bashInstallInstructions(binName);
      case "zsh":
        return zshInstallInstructions(binName);
      case "fish":
        return fishInstallInstructions(binName);
      default:
        throw new Error(`Unsupported shell: ${shell}`);
    }
  }

  /**
   * Detect current shell from environment
   */
  static detectShell(): ShellType | null {
    const shell = process.env.SHELL || "";

    if (shell.includes("zsh")) return "zsh";
    if (shell.includes("bash")) return "bash";
    if (shell.includes("fish")) return "fish";

    return null;
  }

  /**
   * Get list of supported shells
   */
  static getSupportedShells(): ShellType[] {
    return ["bash", "zsh", "fish"];
  }
}
