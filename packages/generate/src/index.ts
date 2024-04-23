import { createPontxGeneratePlugin, getFilesBySpecs, snippetsProvider } from "./plugin/index";

export * from "./plugin/index";
export * from "./utils";
export * from "./language/index";

export const defaultPlugin = createPontxGeneratePlugin({
  snippetsProvider,
  getFilesBySpecs,
  getFilesBySginleSpec: async (spec, conf, options) => {
    const newSpec = { ...spec, name: "single" };
    const files = await getFilesBySpecs(
      [
        {
          spec: newSpec,
          conf: conf as any,
          name: "single",
        },
      ],
      { ...options, multiple: false },
    );

    return files["single"] as any;
  },
});
