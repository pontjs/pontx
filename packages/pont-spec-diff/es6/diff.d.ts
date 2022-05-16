import * as PontSpec from "pont-spec";
export declare type DiffResult<T> = T & {
    diffs: {
        [key in keyof T]: any;
    };
    type: "update" | "create" | "delete";
};
export declare function diffList<T>(localList: T[], remoteList: T[], diffId: string, customDiff: any): T[];
export declare const diffPontSpec: (localSpec: PontSpec.PontSpec, remoteSpec: PontSpec.PontSpec) => DiffResult<PontSpec.PontSpec>;
