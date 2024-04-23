import { PontSpec } from "pontx-spec";
import { PontUIService } from "pontx-ui/dist/es6/components/utils/service";
import * as _ from "lodash";
import { getVSCode } from "./utils/utils";

if (import.meta.env.PROD) {
  const requestPostMessage = <T,>(message: { type: string; value?: any }): Promise<T> => {
    const requestId = _.uniqueId();
    getVSCode().postMessage({ ...message, requestId });

    return new Promise((resove, reject) => {
      window.addEventListener("message", (event) => {
        const responseMessage = event.data;
        if (responseMessage?.type === message.type && responseMessage?.requestId === requestId) {
          return resove(responseMessage.data as T);
        }
      });
    });
  };

  Object.keys(PontUIService).forEach((methodName) => {
    PontUIService[methodName] = (value, ...args) => {
      return requestPostMessage<void>({
        type: methodName,
        value,
      });
    };
  });
}
// todo
