import { PontUIService } from "pont-ui";
import * as React from "react";
import { useEffect } from "react";
import { PontSpec } from "pont-spec";
import { WebviewApi } from "vscode-webview";

declare let acquireVsCodeApi: any;
const vscode: WebviewApi<any> = acquireVsCodeApi?.();

export function useCurrentSpec() {
  const [currentSpec, setCurrentSpec] = React.useState(undefined as PontSpec);

  useEffect(() => {
    PontUIService.requestPontSpecs().then((result) => {
      const currentSpec =
        result.localSpecs?.find((spec) => spec?.name === result?.currentOriginName) || result?.localSpecs?.[0];
      setCurrentSpec(currentSpec);
    });
  }, []);

  return {
    currentSpec,
  };
}

export { vscode };
