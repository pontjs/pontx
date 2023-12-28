import * as React from "react";

export const getRefSchema = (schemas) => ($ref: string) => {
  const schemaName = $ref.split("/").pop();
  const schema = schemas?.[schemaName];
  if (schema) {
    return schema;
  }
  return null;
};

export const renderExpandIcon = (node, onExpand) => {
  return (
    <div
      className="relative flex items-center justify-center cursor-pointer rounded hover:bg-darken-3"
      style={{
        marginLeft: -23.5,
        width: 20,
        height: 20,
        textAlign: "center",
      }}
      onClick={() => {
        onExpand(node);
      }}
    >
      <i className={node.isExpanded ? "codicon codicon-chevron-down" : "codicon codicon-chevron-right"}></i>
    </div>
  );
};
