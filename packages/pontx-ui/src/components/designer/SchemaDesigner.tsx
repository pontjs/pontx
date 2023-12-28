/**
 * @author
 * @description
 */
import * as React from "react";

export class TypeSelectorProps {}

export const TypeSelector: React.FC<TypeSelectorProps> = (props) => {
  const [selectedType, setSelectedType] = React.useState<string>("");
  const [selectedFormat, setSelectedFormat] = React.useState<string>("");

  return <div></div>;
};

TypeSelector.defaultProps = new TypeSelectorProps();
