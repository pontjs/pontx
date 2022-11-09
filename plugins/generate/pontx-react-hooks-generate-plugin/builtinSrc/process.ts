"use sloppy";
import { PontCore } from "./core";

export const processSingleSpec = () => {
  const globalAPI = (window as any).API;
  if (!globalAPI) {
    return;
  }
  PontCore.process(globalAPI);
};

export const processSpecs = () => {
  const globalAPI = (window as any).API;

  if (!globalAPI) {
    return;
  }

  Object.keys(globalAPI).forEach((specName) => {
    const spec = globalAPI[specName];
    PontCore.process(spec);
  });
};
