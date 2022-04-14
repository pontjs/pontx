export type NonNegativeInteger = number;
export type NonNegativeIntegerDefault0 = NonNegativeInteger;
export type JsonSchemaArray = JsonSchema[];
export type SimpleTypes =
  | "array"
  | "boolean"
  | "integer"
  | "null"
  | "number"
  | "object"
  | "string";
export type StringArray = string[];

export interface JsonSchemaMap {
  [key: string]: JsonSchema;
}

export interface CoreSchemaMetaSchema {
  $id?: string;
  $schema?: string;
  $ref?: string;
  $comment?: string;
  title?: string;
  description?: string;
  default?: any;
  readOnly?: boolean;
  examples?: any[];
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: NonNegativeInteger;
  minLength?: NonNegativeIntegerDefault0;
  pattern?: string;
  additionalItems?: JsonSchema;
  items?: JsonSchema | JsonSchemaArray;
  maxItems?: NonNegativeInteger;
  minItems?: NonNegativeIntegerDefault0;
  uniqueItems?: boolean;
  contains?: JsonSchema;
  maxProperties?: NonNegativeInteger;
  minProperties?: NonNegativeIntegerDefault0;
  required?: StringArray;
  additionalProperties?: JsonSchema;
  definitions?: JsonSchemaMap;
  properties?: JsonSchemaMap;
  patternProperties?: JsonSchemaMap;
  dependencies?: {
    [k: string]: JsonSchema | StringArray;
  };
  propertyNames?: JsonSchema;
  const?: any;
  enum?: any[];
  type?: SimpleTypes | SimpleTypes[];
  format?: string;
  contentMediaType?: string;
  contentEncoding?: string;
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;
  allOf?: JsonSchemaArray;
  anyOf?: JsonSchemaArray;
  oneOf?: JsonSchemaArray;
  not?: JsonSchema;
  [k: string]: any;
}

export interface JsonSchema extends CoreSchemaMetaSchema {}
export class JsonSchema {}
