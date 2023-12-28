/**
 * @author
 * @description
 */

import * as React from "react";
import { SemixJsonSchema } from "semix-core";
import { SemixSchemaTable, InnerSchemaTable } from "semix-schema-table";
import * as PontSpec from "pontx-spec";
import { getRefSchema, renderExpandIcon } from "./utils";

export class PontxParamsDocProps {
  parameters?: PontSpec.Parameter[];
  apiName?: string;
  schemas?: PontSpec.ObjectMap<SemixJsonSchema>;
}

export const ApiParamsDoc: React.FC<PontxParamsDocProps> = (props) => {
  const schema = React.useMemo(() => {
    let schema = {
      type: "object",
      properties: {},
    } as SemixJsonSchema;
    if (props.parameters) {
      props.parameters.forEach((param) => {
        schema.properties[param.name] = {
          ...(param.schema || {}),
          in: param.in,
        };
      });
    }
    return schema;
  }, [props.parameters]);
  const propSchemaCnt = Object.keys(props.schemas || {}).length;

  const getSchema = React.useCallback(
    ($ref) => {
      return getRefSchema(props.schemas)($ref);
    },
    [props.schemas],
  );

  return React.useMemo(() => {
    return (
      <div className="api-params-doc">
        {!props.parameters?.length ? (
          <div className="empty-params">本 API 无入参定义</div>
        ) : (
          <InnerSchemaTable
            name=""
            renderExpandIcon={renderExpandIcon}
            renderEmpty={() => {
              return (
                <tr>
                  <td colSpan={2} style={{ padding: "15px 0", textAlign: "center" }}>
                    无参数定义
                  </td>
                </tr>
              );
            }}
            schema={schema}
          />
        )}
      </div>
    );
  }, [props.parameters, propSchemaCnt, props.schemas]);
};

ApiParamsDoc.defaultProps = new PontxParamsDocProps();
