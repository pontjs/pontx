/**
 * @author
 * @description
 */
import * as React from "react";
import { PontUIService } from "pontx-ui";
import { useCurrentSpec } from "../utils/utils";

export class APIDocumentProps {}

export const APIDocument: React.FC<APIDocumentProps> = (props) => {
  const { currentSpec } = useCurrentSpec();

  return <div></div>;
};

APIDocument.defaultProps = new APIDocumentProps();
