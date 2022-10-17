import { PontUIService } from "pontx-ui";
import * as React from "react";
import { useEffect } from "react";
import { PontSpec } from "pontx-spec";
import { WebviewApi } from "vscode-webview";

declare let acquireVsCodeApi: any;
export const getVSCode = () => {
  if (((window as any).vscode)) {
    return (window as any).vscode;
  }

  const vscode: WebviewApi<any> = acquireVsCodeApi?.();
  (window as any).vscode = vscode;

  return vscode;
}

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

