/**
 * @author
 * @description
 */

import * as React from "react";
import { SemixJsonSchema } from "semix-core";
import { SemixSchemaTable } from "semix-schema-table";
import * as PontSpec from "pontx-spec";
import { getRefSchema } from "./utils";

export class PontxParamsDocProps {
  parameters?: PontSpec.Parameter[];
  apiName?: string;
  schemas?: PontSpec.ObjectMap<SemixJsonSchema>;
}

export const ApiParamsDoc: React.FC<PontxParamsDocProps> = (props) => {
  const schema = React.useMemo(() => {
    const schema = {
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
        <SemixSchemaTable
          name=""
          renderExpandIcon={(node, onExpand) => {
            return (
              <div
                className="relative flex items-center justify-center cursor-pointer rounded hover:bg-darken-3"
                style={{
                  marginLeft: -23.5,
                  width: 20,
                  height: 20,
                  marginRight: 3,
                  textAlign: "center",
                }}
                onClick={() => {
                  onExpand(node);
                }}
              >
                <i className={node.isExpanded ? "codicon codicon-chevron-down" : "codicon codicon-chevron-right"}></i>
              </div>
            );
          }}
          getRefSchema={getSchema}
          renderTypeColAppendix={(node) => {
            if (node?.nodeValue?.schema.in) {
              return (
                <div
                  className="in"
                  style={{
                    color: "gray",
                    fontFamily: "monospace",
                    fontSize: 12,
                    fontStyle: "italic",
                    fontWeight: 600,
                  }}
                >
                  ({node.nodeValue?.schema.in})
                </div>
              );
            }
            return null;
          }}
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
          schemas={props.schemas}
        />
      </div>
    );
  }, [schema, propSchemaCnt, props.schemas]);
};

ApiParamsDoc.defaultProps = new PontxParamsDocProps();
