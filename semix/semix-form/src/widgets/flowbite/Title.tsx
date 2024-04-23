/**
 * @author
 * @description title
 */
import * as React from "react";
import { SemixUISchema } from "../../type";
import classNames from "classnames";

export class TitleProps {
  schema: SemixUISchema;
  collapsed: boolean;
  setCollapsed: any;
  fieldName: string;
  isRequired: boolean;
  titleOperator? = null as any;
}

export const Title: React.FC<TitleProps> = (props) => {
  let hasCollapsedIcon = ["object", "array"].includes(props.schema.type as any);
  if (props.schema?.type === "array" && ["string", "number", "integer"].includes(props.schema?.items?.type as any)) {
    hasCollapsedIcon = false;
  }

  return (
    <div className={classNames("semix-form-title")}>
      <span
        className={classNames("title", {
          required: props.isRequired,
        })}
      >
        <span>{props.schema?.title || props.fieldName}</span>
        {props.titleOperator ? <span className="pull-right">{props.titleOperator}</span> : null}
      </span>
      {/* {props.schema?.description ? <span className="desc">{props.schema.description}</span> : null} */}
      {/* {props.schema?.title ? <span className="desc">{props.schema.title}</span> : null} */}
    </div>
  );
};

Title.defaultProps = new TitleProps();
