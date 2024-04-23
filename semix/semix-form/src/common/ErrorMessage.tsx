/**
 * @author
 * @description
 */
import * as React from "react";
import { ErrorField, FormStoreContext } from "../context";
import { ERROR_MESSAGE_COMPONENT_TYPE, SemixUISchema } from "../type";

export class ErrorMessageProps {
  schema: SemixUISchema;
  dataPath: string;
  errorFields: ErrorField[];
}

export const ErrorMessage: React.FC<ErrorMessageProps> = (props) => {
  const { widgets } = FormStoreContext.useContainer();
  const WidgetComponent = widgets[ERROR_MESSAGE_COMPONENT_TYPE];

  if (WidgetComponent) {
    return React.createElement(WidgetComponent, {
      errorFields: props.errorFields,
    });
  }

  if (props.errorFields?.length) {
    return <span className='semix-form-error'>{props.errorFields[0]?.message}</span>;
  }
  return null;
};

ErrorMessage.defaultProps = new ErrorMessageProps();
