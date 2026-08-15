import type { PontxAsyncApiSpec } from "../../asyncapi.js";
import { checkNeedQuotationMark, indentation } from "../utils.js";
import { generateSchemaCode } from "./schema.js";

function propertyName(name: string) {
  return checkNeedQuotationMark(name) ? JSON.stringify(name) : name;
}

function messagePayloadType(asyncapi: PontxAsyncApiSpec, messageName: string) {
  const message = asyncapi.messages[messageName];
  return message?.payload
    ? generateSchemaCode(message.payload, "schemas.")
    : "unknown";
}

function actionMessageType(
  asyncapi: PontxAsyncApiSpec,
  action: "send" | "receive"
) {
  const messageNames = new Set(
    Object.values(asyncapi.operations)
      .filter((operation) => operation.action === action)
      .flatMap((operation) => operation.messages)
  );
  const types = [...messageNames].map((messageName) =>
    messagePayloadType(asyncapi, messageName)
  );

  return types.length ? [...new Set(types)].join(" | ") : "never";
}

/**
 * Generates type-only definitions for AsyncAPI operations. Runtime connection
 * creation remains explicit, so a generated SDK never opens a stream or reads
 * credentials merely from importing a module.
 */
export function generateAsyncApiTypes(asyncapi: PontxAsyncApiSpec) {
  const usesSchemas = Object.keys(asyncapi.components.schemas || {}).length > 0;
  const prefix = usesSchemas ? 'import type * as schemas from "./schemas";\n\n' : "";
  const operations = Object.values(asyncapi.operations)
    .map((operation) => {
      const messages = operation.messages.length
        ? operation.messages
            .map(
              (messageName) =>
                `${propertyName(messageName)}: ${messagePayloadType(
                  asyncapi,
                  messageName
                )};`
            )
            .join("\n")
        : "[message: string]: unknown;";

      return `${propertyName(operation.name)}: {\n${indentation(2)(
        `action: ${JSON.stringify(operation.action)};\nchannel: ${JSON.stringify(
          operation.channel
        )};\nmessages: {\n${indentation(2)(messages)}\n};`
      )}\n};`;
    })
    .join("\n\n");

  return `${prefix}export type StreamOperations = {\n${indentation(2)(
    operations || "[operation: string]: never;"
  )}\n};\n\nexport type StreamSendMessage = ${actionMessageType(
    asyncapi,
    "send"
  )};\n\nexport type StreamReceivedMessage = ${actionMessageType(
    asyncapi,
    "receive"
  )};\n`;
}
