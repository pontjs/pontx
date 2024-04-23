import { SemixJsonSchema } from "semix-core";

type SemixFormSchema = {
  widget?: string;
  disabled?: boolean;
  visible?: string;
  hidden?: boolean;
  required?: string[];
  enumValueTitles?: {
    [x: string]: string;
  };
  layout: {
    labelWidth?: number;

    displayType?: "horizontal" | "vertical" | "inline";
  };
  props: {
    className?: string;
    placeholder?: string;

    unCheckedChildren?: string;

    checkedChildren?: string;

    /** 枚举值为空时，下拉框展示内容，一般用于推荐枚举值为空时引导用户 */
    emptyEnumContent?: any;
  };
  style: React.CSSProperties;
};

type DeprecatedFormSchema = {
  isRoot?: boolean;

  unCheckedChildren?: string;

  checkedChildren?: string;

  mode?: "simple" | "card";

  /** 是否存在，一般用于条件式存在的表单项 */
  exists?: boolean;

  properties?: any;
  additionalProperties?: DeprecatedUISchema;
  items?: DeprecatedUISchema;

  /** 枚举值为空时，下拉框展示内容，一般用于推荐枚举值为空时引导用户 */
  emptyEnumContent?: any;

  displayType?: "row" | "column" | "inline";
};

export type SemixUISchema = SemixJsonSchema & SemixFormSchema;
export type DeprecatedUISchema = SemixJsonSchema & SemixFormSchema & DeprecatedFormSchema;

export class ErrorField {
  dataPath: string;
  message: string;
  [x: string]: any;
}

export const ERROR_MESSAGE_COMPONENT_TYPE = "ERROR_MESSAGE_COMPONENT_TYPE";

export class CommonWidgetProps {
  value: any;
  schema = {} as SemixUISchema;
  onChange(value: any) {}
}

export class ListProps {
  addItem: () => any;
  copyItem: (index: number) => any;
  deleteItem: (index: number) => any;
  errorFields: ErrorField[];
  dataPath: string;
  schemaPath: string;
  schema: SemixUISchema;
  displayList: any[];
  fieldName: string;
  renderTitle?: Function;
}

export class MapProps {
  editItemKey: (index: number, newKey: string) => any;
  addItem: () => any;
  copyItem: (index: number) => any;
  deleteItem: (index: number) => any;
  errorFields: ErrorField[];
  dataPath: string;
  schema: SemixUISchema;
  displayList: any[];
  fieldName: string;
  renderTitle?: Function;
}
