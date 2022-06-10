import * as PontSpec from "pont-spec";
import { PontJsonSchemaOp } from "./BaseClassSchema";
import { SchemaTableNode } from "./SchemaTableNode";

export class ParameterSchema extends PontSpec.Parameter {
  static genrateRows(parameters: ParameterSchema[]): SchemaTableNode[] {
    return parameters
      .map((parameter, paramIndex) => {
        return PontJsonSchemaOp.genrateRows(parameter.schema, {
          parentType: "root",
          fieldName: parameter.name,
          prefixes: [paramIndex, "schema"],
          keys: [parameter.name],
          orderInParent: paramIndex,
          isEndInParent: paramIndex === parameters.length - 1,
          isParentMap: false,
          rootParameter: parameter,
        });
      })
      .reduce((pre, curr) => pre.concat(curr), []);
  }
}
