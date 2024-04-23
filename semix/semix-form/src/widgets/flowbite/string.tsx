import { CommonWidgetProps } from "../../type";
import * as React from "react";
import { TextInput, Tooltip, Textarea } from "flowbite-react";
import { ArrowsRightLeftIcon } from "@heroicons/react/20/solid";

export class StringProps extends CommonWidgetProps {
  isTextarea?: boolean;
  placeholder?: string;
}

export const String: React.FC<StringProps> = (props) => {
  const { schema, ...rest } = props;
  const [curvalue, setCurvalue] = React.useState("");
  const [isToTextArea, setIsToTextArea] = React.useState(props.isTextarea);

  React.useEffect(() => {
    if (props.value !== curvalue) {
      if (props.value && typeof props.value !== "string") {
        setCurvalue(props.value + "");
        props.onChange(props.value + "");
      } else {
        setCurvalue(props.value);
      }
    }
  }, [props.value]);

  React.useEffect(() => {
    if (schema.const && curvalue !== schema.const) {
      setCurvalue(schema.const);
    }
  }, [schema.const]);

  const ref = React.useRef();
  const textareaRef = React.useRef();

  const changeCurValue = React.useCallback((val: any) => {
    const value = val === "" ? (undefined as any) : val;
    if (value) {
      setCurvalue(value);
    } else {
      props.onChange(undefined);
      setCurvalue(undefined);
    }
  }, []);

  const emitvalues = React.useCallback(() => {
    if (props.value === curvalue) {
      return;
    }
    props.onChange(curvalue);
  }, [curvalue]);

  const getNewTextareaValueAndPosition = (newValue: string) => {
    if (!ref || !ref.current || isToTextArea) return { value: newValue, position: newValue.length };
    if (!curvalue) return { value: newValue, position: newValue.length };
    try {
      // @ts-ignore
      const { selectionStart } = ref.current.input;
      const startV = curvalue.substring(0, selectionStart);
      const endV = curvalue.substring(selectionStart, curvalue.length);
      return {
        value: `${startV}${newValue}${endV}`,
        position: selectionStart + (newValue?.length || 0),
      };
    } catch (error) {
      return { value: newValue, position: newValue.length };
    }
  };

  let formItem = null;
  let inputType = "input";

  if ((isToTextArea || (typeof curvalue === "string" && curvalue.includes("\n"))) && props.schema?.type !== "number") {
    inputType = "textarea";
  }

  const placeholder = React.useMemo(() => {
    if (props.placeholder) {
      return props.placeholder;
    }
    if (curvalue === "") {
      return "空字符串";
    } else if (props.schema?.format === "int64" || props.schema?.format === "double") {
      return "请输入数值";
    } else {
      return schema?.props?.placeholder || "请输入字符串";
    }
  }, [curvalue, props.schema, props.placeholder]);

  const errorMsg = React.useMemo(() => {
    if (props.schema?.format === "int64" || props.schema?.format === "double") {
      return !curvalue || Number(curvalue) ? null : "请输入数值";
    }
    return null;
  }, [props.schema, curvalue]);

  switch (inputType) {
    case "textarea":
      formItem = (
        <div className="generate-form-text-area flex-1">
          <Textarea
            style={{ resize: "none" }}
            ref={textareaRef}
            rows={3}
            value={curvalue}
            placeholder={placeholder}
            disabled={schema.disabled}
            onBlur={emitvalues}
            onChange={(e) => {
              changeCurValue(e.target.value);
            }}
          />
          <Tooltip content="转换为 Input，转换后将丢失换行符">
            <span
              className="generate-form-text-area-icon"
              onClick={() => {
                setCurvalue((curvalue || "").replace(/\n/gi, ""));
                setIsToTextArea(false);
              }}
            >
              <ArrowsRightLeftIcon />
            </span>
          </Tooltip>
        </div>
      );
      break;
    default:
    case "input":
      formItem = (
        <div className="input-area flex-1">
          <TextInput
            style={{ width: "100%" }}
            placeholder={placeholder}
            value={curvalue}
            onBlur={emitvalues}
            disabled={schema.disabled}
            onChange={(e) => {
              changeCurValue(e.target.value);
            }}
            ref={ref}
            onPaste={(e) => {
              const v = e.clipboardData.getData("text");
              if (typeof v === "string" && v.includes("\n")) {
                setIsToTextArea(true);
                e.preventDefault();
                const { value: newValue, position } = getNewTextareaValueAndPosition(v);
                setCurvalue(newValue);
                Promise.resolve().then(() => {
                  // @ts-ignore
                  textareaRef?.current?.resizableTextArea?.textArea?.focus();
                  // @ts-ignore
                  textareaRef?.current?.resizableTextArea?.textArea?.setSelectionRange(position, position);
                });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setIsToTextArea(true);
                e.preventDefault();
                const { value: newValue, position } = getNewTextareaValueAndPosition("\n");
                setCurvalue(newValue);
                Promise.resolve().then(() => {
                  // @ts-ignore
                  textareaRef?.current?.resizableTextArea?.textArea?.focus();
                  // @ts-ignore
                  textareaRef?.current?.resizableTextArea?.textArea?.setSelectionRange(position, position);
                });
              }
            }}
          ></TextInput>
        </div>
      );
      break;
  }

  return (
    <div className="semix-form-widget semix-string-item">
      {formItem}
      <div style={{ color: "red" }}>{errorMsg}</div>
    </div>
  );
};

String.defaultProps = new StringProps();
