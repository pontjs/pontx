import { OAS2, JsonSchema, CoreSchemaMetaSchema } from "oas-spec-ts";
import { PontJsonSchema } from "./dataType";
import { Parameter } from "./parameter";
import { mapifyImmutableOperate, mapifyOperateList, mapifyGet } from "./utils";
export {
  JsonSchema,
  CoreSchemaMetaSchema,
  PontJsonSchema,
  Parameter,
  mapifyImmutableOperate,
  mapifyOperateList,
  mapifyGet,
};
declare type ResponseObject = {
  schema: PontJsonSchema;
  headers: OAS2.HeadersObject;
};
export declare class Interface {
  consumes: string[];
  parameters: Parameter[];
  description: string;
  responses: {
    [key: string]: ResponseObject;
  };
  method: string;
  name: string;
  title?: string;
  path: string;
  deprecated: boolean;
}
export declare class Mod {
  description: string;
  interfaces: Interface[];
  name: string;
  constructor(mod: Partial<Mod>);
}
export declare class BaseClass {
  name: string;
  schema: PontJsonSchema;
}
export declare class PontSpec {
  name: string;
  baseClasses: BaseClass[];
  mods: Mod[];
  ext?: any;
  static reOrder(ds: PontSpec): PontSpec;
  static validateLock(ds: PontSpec): string[];
  static serialize(ds: PontSpec): string;
  constructor(ds?: { mods: Mod[]; name: string; baseClasses: BaseClass[] });
  static constructorByName(name: string): PontSpec;
  static isEmptySpec(spec: PontSpec): boolean;
  static findBaseClazz(spec: PontSpec, clazzName: string): BaseClass;
  static findApi(spec: PontSpec, modName: string, apiName: string): any;
}
