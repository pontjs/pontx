import * as React from "react";
import { MapProps } from "../../type";
import { immutableSet, getNextDataPath } from "../../utils";
import { Field } from "../../common/Field";
import { TextInput, Button } from "flowbite-react";
import { DocumentDuplicateIcon, TrashIcon } from "@heroicons/react/24/solid";
import { PlusIcon } from "@heroicons/react/20/solid";

export class SimpleMapProps extends MapProps {}

export const SimpleMap: React.FC<SimpleMapProps> = (props) => {
  const [listKeys, changeListKeys] = React.useState((props.displayList || []).map(({ key }) => key));

  React.useEffect(() => {
    changeListKeys((props.displayList || []).map(({ key }) => key));
  }, [props.displayList]);

  const children = React.useMemo(() => {
    return (props.displayList || []).map(({ key, value }, index) => {
      const keyItem = (
        <>
          <TextInput
            style={{ width: 200 }}
            value={listKeys[index]}
            placeholder="字符串"
            onChange={(newValue) => {
              changeListKeys(immutableSet(index, newValue, listKeys) as any);
            }}
            onBlur={() => {
              props.editItemKey(index, listKeys[index]);
            }}
          />
          <span style={{ float: "right" }}>
            {props.schema?.widget === "typeSelect" ? null : (
              <a
                href="javascript:;"
                className="op"
                onClick={() => {
                  props.copyItem(index);
                }}
              >
                <DocumentDuplicateIcon />
              </a>
            )}
            <a
              href="javascript:;"
              className="op"
              onClick={() => {
                props.deleteItem(index);
              }}
            >
              <TrashIcon />
            </a>
          </span>
        </>
      );
      const valueItem = (
        <div>
          <Field
            schema={props.schema}
            isRequired={false}
            key={key}
            dataPath={getNextDataPath(props.dataPath, key)}
          ></Field>
        </div>
      );

      return (
        <div className="list-item" key={index}>
          <span className="key-item">
            <div style={{ marginBottom: "8px" }}>
              {keyItem}
              <span className="sep" style={{ lineHeight: "30px" }}>
                {" "}
                :
              </span>
            </div>
            <div>{valueItem}</div>
          </span>
        </div>
      );
    });
  }, [props.displayList, listKeys]);
  return (
    <div className="semix-form-list semix-complex-type-item">
      <div className="child-list">
        {children}
        <div className="operators map">
          <Button
            style={{ textDecoration: "none" }}
            size="small"
            className="op"
            onClick={() => {
              props.addItem();
            }}
          >
            <PlusIcon type="plus" style={{ marginRight: "5px", marginTop: "1px" }} />
            添加
          </Button>
        </div>
      </div>
    </div>
  );
};

SimpleMap.defaultProps = new SimpleMapProps();
