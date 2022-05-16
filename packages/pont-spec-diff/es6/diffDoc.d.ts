export declare class BaseClazzDiffOp {
    static getFields(fields: string[]): string;
    static getSchemaDiffItems(diffResult: any, fields: string[]): {
        localValue: any;
        remoteValue: any;
        fields: string[];
        type: string;
    };
}
