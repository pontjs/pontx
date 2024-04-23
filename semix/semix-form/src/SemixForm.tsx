/**
 * @author
 * @description
 */
import * as React from "react";
import _ from "lodash";
import { SemixUISchema } from "./type";
import { FormInstance, FormStoreContext, FormStoreIntialState, useForm } from "./context";
import { Field } from "./common/Field";
import { useDeepCompareMemo } from "use-deep-compare";
import { FormItem } from "./common/FormItem";
import { getFieldClassName } from "./utils";
import classNames from "classnames";
import { defaultWidgets } from "./defaultWidgets";

export { useForm };

export class SemixFormProps {
  onChange?(value: any) {}

  readOnly? = false;

  form?: FormInstance<any>;

  /** 自定义组件库 */
  widgets? = {} as any;

  /** 整体表单是否必填 */
  isRequired? = false;

  /** 文件上传请求 */
  uploadFile?: Function;

  customIcon?: any;

  renderGroupArea?: (props: {
    key: string;
    index: number;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
  }) => any;

  renderTitle?: (props: {
    schema: SemixUISchema;
    isRequired: boolean;
    fieldName: string;
    dataPath: string;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    titleOperator: any;
  }) => any;

  children?: any;
}

const InternalSemixForm: React.FC<SemixFormProps> = (props, ref) => {
  const form = props.form;
  // const propSchema = form.schema;
  // const propSchema = React.useMemo(() => {
  //   let resultSchema = props.schema;

  //   if (resultSchema?.$ref) {
  //     resultSchema = getSchemaByRef(resultSchema, resultSchema.$ref);
  //   }

  //   return resultSchema;
  // }, [props.schema]);

  const {
    errorFields,
    isValidating,
    formData,
    setExtraErrorFields,
    setInternalErrorFields,
    setFormData,
    setValidating,
    schema,
  } = form;
  const widgets = { ...defaultWidgets, ...(props.widgets || {}) } as any;
  const renderTitle =
    props.renderTitle || (widgets?.title ? (titleProps) => React.createElement(widgets?.title, titleProps) : null);
  const formStoreState = React.useMemo(() => {
    return {
      widgets: widgets,
      renderGroupArea: props.renderGroupArea,
      renderTitle,
      uploadFile: props.uploadFile,
      errorFields,
      setExtraErrorFields,
      setInternalErrorFields,
      setFormData,
      schema: schema,
      setValidating,
      isValidating,
      propsOnChange: props.onChange,
      readOnly: props.readOnly!,
      formData,
      customIcon: props.customIcon,
    } as FormStoreIntialState;
  }, [errorFields, isValidating, formData, props.readOnly, props.renderGroupArea, renderTitle, schema]);
  const cx = getFieldClassName(formStoreState.schema);

  return React.useMemo(() => {
    return (
      <div className={classNames("semix-form", cx)}>
        <FormStoreContext.Provider initialState={formStoreState}>
          {props.children || (
            <Field schema={formStoreState.schema as any} isRequired={props.isRequired!} dataPath="" schemaPath="" />
          )}
        </FormStoreContext.Provider>
      </div>
    );
  }, [formStoreState, props.children]);
};
(InternalSemixForm as any).Item = FormItem;
(InternalSemixForm as any).useForm = useForm;

InternalSemixForm.defaultProps = new SemixFormProps();
declare type InternalFormType = typeof InternalSemixForm;
interface SemixFormType extends InternalFormType {
  useForm: typeof useForm;
  Item: typeof FormItem;
}

export const SemixForm = InternalSemixForm as SemixFormType;
