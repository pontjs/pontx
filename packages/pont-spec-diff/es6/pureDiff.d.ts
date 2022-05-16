import * as PontSpec from "pont-spec";
export declare type DiffResult = {
    remoteValue: any;
    localValue: any;
    paths: string[];
    type: "update" | "create" | "delete";
};
export declare function diffList<T>(localList: T[], remoteList: T[], paths: string[], customDiff?: CustomDiff): DiffResult[];
declare type CustomDiff = {
    [key: string]: <T>(pre: T, next: T, paths: string[], customDiff: any) => DiffResult[];
};
export declare const diffApi: (localApi: PontSpec.Interface, remoteApi: PontSpec.Interface) => DiffResult[];
export declare const diffBaseClass: (localClazz: PontSpec.BaseClass, Clazz: PontSpec.BaseClass) => DiffResult[];
export {};
