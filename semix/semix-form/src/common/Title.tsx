/**
 * @author
 * @description title
 */
import * as React from "react";
import { SemixUISchema } from "../type";

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
    <div className="semix-form-title">
      {/* {hasCollapsedIcon ? (
        <RightOutlined
          onClick={() => {
            props.setCollapsed(!props.collapsed);
          }}
          style={{ marginRight: 8 }}
          rotate={props.collapsed ? 0 : 90}
        />
      ) : null} */}
      <span className={props.isRequired ? "required title" : "title"}>{props.schema?.title || props.fieldName}</span>
      {/* {props.schema?.description ? <span className="desc">{props.schema.description}</span> : null} */}
      {/* {props.schema?.title ? <span className="desc">{props.schema.title}</span> : null} */}
      {props.titleOperator ? <span className="pull-right">{props.titleOperator}</span> : null}
    </div>
  );
};

Title.defaultProps = new TitleProps();
