import * as React from "react";
import _ from "lodash";
import { CommonWidgetProps, SemixUISchema } from "../../type";
import { FormStoreContext } from "../../context";
import { Field } from "../../common/Field";
import { getNextDataPath } from "../../utils";

export class RenderObjectProps {
  schema: SemixUISchema;
  dataPath: string;
  schemaPath: string;
  value: any;
  onChange: (value: any) => void;
}

export const RenderObject: React.FC<RenderObjectProps> = (props) => {
  React.useEffect(() => {
    if (props.value && typeof props.value === "string") {
      let value = {};
      try {
        const tmpValue = JSON.parse(props.value);
        if (typeof tmpValue === "object") {
          value = tmpValue;
        }
      } catch {}
      props.onChange(value);
    }
  }, []);
  const [groupCollapsed, setGroupCollapsed] = React.useState({} as { [x: string]: boolean });
  const store = FormStoreContext.useContainer();

  return React.useMemo(() => {
    if (props.schema?.properties) {
      const propItems = Object.keys((props.schema?.properties as any) || {}).map((key) => {
        return { key, schema: props.schema?.properties[key] };
      });
      const propItemsGroups = _.groupBy(propItems, (item) => {
        return item.schema?.group || "";
      });
      const renderField = (key: string) => {
        return (
          <Field
            fieldName={key}
            key={key}
            isRequired={props.schema.required ? props.schema.required?.includes(key)! : false}
            dataPath={getNextDataPath(props.dataPath, key)}
            schemaPath={getNextDataPath(props.schemaPath ? props.schemaPath + ".properties" : props.schemaPath, key)}
            schema={props.schema?.properties?.[key]!}
          />
        );
      };
      const noGroupPropItems = (propItemsGroups?.[""] || []).map((item) => {
        return renderField(item?.key);
      });
      const groups = _.map(propItemsGroups, (items, groupKey) => {
        if (groupKey) {
          const titleProps = {
            key: groupKey,
            index: items?.[0]?.schema?.groupIndex,
            collapsed: groupCollapsed[groupKey],
            setCollapsed: (newCollapsed: boolean) =>
              setGroupCollapsed((boolMap) => {
                return {
                  ...boolMap,
                  [groupKey]: newCollapsed,
                };
              }),
          };
          const title = store.renderGroupArea?.(titleProps) || <div className="area-title">{groupKey}</div>;

          return {
            dom: (
              <div className="group-area" key={groupKey}>
                {title}
                {groupCollapsed[groupKey] ? null : (
                  <div className="area-content">{(items || []).map((item) => renderField(item?.key))}</div>
                )}
              </div>
            ),
            index: items?.[0]?.schema?.groupIndex,
          };
        }
        return null;
      }).filter((id) => id);

      const result = [
        ...groups,
        {
          dom: noGroupPropItems,
          index: 0,
        },
      ]
        .sort((pre, next) => pre.index - next.index)
        .map((item) => {
          return item.dom;
        });

      return (
        <div className="semix-form-object">
          <div className="child-list">{result}</div>
        </div>
      );
    }
    return null;
  }, [groupCollapsed, props.schema, props.dataPath]);
};

RenderObject.defaultProps = new RenderObjectProps();
