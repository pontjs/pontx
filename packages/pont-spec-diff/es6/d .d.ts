import { DiffResult } from "./pureDiff";
export declare class ApiDiffOp {
    static getParameterDiffItems(diffResult: DiffResult, paramName: string): string;
    static getAPIDiffItems(diffResult: DiffResult): string;
}
