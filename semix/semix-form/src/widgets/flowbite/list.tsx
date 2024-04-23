import * as React from "react";
import { CommonWidgetProps, ListProps } from "../../type";
import { DocumentDuplicateIcon, TrashIcon, PlusIcon } from "@heroicons/react/20/solid";
import { Field } from "../../common/Field";

export class SimpleListProps extends ListProps {}

export const SimpleList: React.FC<SimpleListProps> = (props) => {
  const children = (props.displayList || []).map((value, index) => {
    return (
      <div className="list-item" key={index}>
        <div className="title-operator">
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
        </div>
        <Field
          fieldName={props.fieldName ? props.fieldName + "." + index : ""}
          key={index}
          isRequired={false}
          dataPath={props.dataPath ? props.dataPath + "." + index : index + ""}
          schemaPath={props.schemaPath ? props.schemaPath + ".items" : ".items"}
          schema={props.schema}
        />
      </div>
    );
  });
  return (
    <div className="semix-form-list">
      <div className="child-list">
        {children}
        <div className="operators">
          <button
            type="button"
            style={{ textDecoration: "none" }}
            className="text-gray-900 bg-white hover:bg-gray-100 border border-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 me-2 mb-2"
            onClick={() => {
              props.addItem();
            }}
          >
            <PlusIcon className="mr-1 mt-0.5" />
            添加
          </button>
        </div>
      </div>
    </div>
  );
};

SimpleList.defaultProps = new SimpleListProps();
