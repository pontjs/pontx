"use sloppy";
import { PontCore } from "./core";

export const processSingleSpec = (metaData, API: any, defs: any, hasModule = true) => {
  if (!metaData) {
    return;
  }
  PontCore.process(metaData, API, defs, hasModule);
};

export const processSpecs = (metaData: any, API: any, defs: any, hasModule = true) => {
  if (!metaData) {
    return;
  }

  Object.keys(metaData).forEach((specName) => {
    const spec = metaData[specName];
    PontCore.process(spec, API[specName], defs[specName], hasModule);
  });
};
