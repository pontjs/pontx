import { JsonSchema } from "oas-spec-ts";
export interface PontJsonSchema extends JsonSchema {
}
export declare class PontJsonSchema {
    isDefsType?: boolean;
    templateIndex?: number;
    templateArgs?: PontJsonSchema[];
    typeName: string;
    example?: string;
    static toString(schema: PontJsonSchema): any;
    static create(): PontJsonSchema;
    static checkIsMap(schema: PontJsonSchema): boolean;
    static getDescription(schema: PontJsonSchema): void;
}
