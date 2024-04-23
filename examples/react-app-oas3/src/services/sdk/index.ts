import type * as defs from "./defs";
import type * as API from "./api";
import { APIs as PetstoreAPIs } from "./petstore/";
import { rootDefaults } from "./defaults";
import { DefaultsType, RootDefaultsType, setSpecDefaults, SpecNames, DefaultsMapType } from "./request";

export const APIs = {
  petstore: PetstoreAPIs,
}

export const setRootDefaults = (defaults: RootDefaultsType) => {
  Object.keys(defaults).forEach((key) => {
    rootDefaults[key] = defaults[key];
  });
};

export const setDefaultsAll = (defaults: RootDefaultsType) => {
  Object.keys(defaults).forEach((key) => {
    rootDefaults[key] = defaults[key];
  });

  Object.keys(APIs).forEach((specName: any) => {
    setSpecDefaults(specName);
  });
};

export const setDefaults = (
  defaultsMap: DefaultsMapType
) => {
  Object.keys(APIs).forEach((specName: any) => {
    const defaults = defaultsMap?.[specName];

    if (defaults && Object.keys(defaults)?.length > 0) {
      setSpecDefaults(specName, defaults);
    }
  });
};

export { defs, API, PetstoreAPIs };
