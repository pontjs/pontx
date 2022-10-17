/**
 * @author jasonHzq
 * @description schema 名称编辑
 */
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import AutosizeInput from "react-input-autosize";
import { isEmptyFieldName } from "../utils";

const maxWidth = "250px";

export class SchemaNameProps {
  value: any;
  onChange(value: any) {}
  isDisabled: boolean;
}

const MyAutosizeInput = AutosizeInput?.default || AutosizeInput;

export const SchemaName: React.FC<SchemaNameProps> = React.memo(
  (props) => {
    const inputRef = React.useRef<HTMLInputElement>();
    const [value, changeValue] = React.useState(props.value);

    useEffect(() => {
      if (props.value !== value) {
        changeValue(props.value);
      }
    }, [props.value]);

    return (
      <span style={{ maxWidth, lineHeight: "20px" }}>
        <MyAutosizeInput
          inputClassName="outline-none bg-transparent hover:bg-darken-1 focus:bg-darken-2 pr-0"
          minWidth={12}
          disabled={props.isDisabled}
          placeholder="name"
          value={isEmptyFieldName(value) ? "" : value}
          onChange={(e) => {
            changeValue(e.target.value);
          }}
          onBlur={(e) => {
            props.onChange(e.target.value);
          }}
          inputRef={(el) => {
            inputRef.current = el;
          }}
        />
      </span>
    );
  },
  (prev, curr) => prev.value === curr.value && prev.isDisabled === curr.isDisabled,
);

SchemaName.defaultProps = new SchemaNameProps();
