import { setDefaults as setPetstoreDefaults, DefaultsType as PetstoreDefaultsType  } from "./petstore/request";

export type SpecNames = 'petstore';

export type DefaultsMapType = {
  petstore: PetstoreDefaultsType;
};

export type DefaultsType<SpecName extends SpecNames> = DefaultsMapType[SpecName];

export type RootDefaultsType = PetstoreDefaultsType;

export const setSpecDefaults = <SpecName extends SpecNames, >(specName: SpecName, defaults: DefaultsType<SpecName> = {} as any) => {
  switch (specName) {
    case "petstore": {
      setPetstoreDefaults(defaults as any);
      break;
    }
  }
};
