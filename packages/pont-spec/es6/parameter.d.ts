import { PontJsonSchema } from "./dataType";
export declare class Parameter {
    schema: PontJsonSchema;
    name: string;
    in: "query" | "body" | "path" | "formData" | "header";
    required: boolean;
}
