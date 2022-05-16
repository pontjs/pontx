export declare function getDuplicateById<T>(arr: T[], idKey?: string): null | T;
export declare function mapifyOperateList<T extends {
    name: string;
}>(operate: "assign" | "delete", name: string, newValue: T, list: T[]): T[];
export declare function mapifyImmutableOperate(result: any, operate: "delete" | "assign", pathes: Array<string | number>, newValue?: any): any;
export declare function mapifyGet(result: any, pathes: Array<string | number>): any;
