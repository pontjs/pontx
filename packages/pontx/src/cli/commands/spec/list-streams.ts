import type { CliContext } from "../../context";

export interface ListStreamsOptions {
  useRemote?: boolean;
  json?: boolean;
}

/** Lists AsyncAPI operations only; it never opens a WebSocket connection. */
export async function listStreamsCommand(
  ctx: CliContext,
  specName: string,
  options: ListStreamsOptions = {}
): Promise<void> {
  const manager = await ctx.getManager();
  const origin = manager.resolvedConfig.origins.find((origin) => origin.name === specName);
  if (!origin) throw new Error(`Spec not found: ${specName}`);

  const spec = options.useRemote ? origin.remoteSpec : origin.spec;
  if (!spec) throw new Error(`Spec not found: ${specName}`);

  const asyncapi = spec.asyncapi;
  const operations = asyncapi ? Object.values(asyncapi.operations) : [];
  const items = operations.map((operation) => ({
    name: operation.name,
    action: operation.action,
    channel: operation.channel,
    messages: operation.messages,
    description: operation.title || operation.summary || operation.description || "",
  }));

  if (options.json) {
    console.log(JSON.stringify({ type: "streams", specName, items }, null, 2));
    return;
  }

  if (!items.length) {
    console.log(`No streaming operations in spec: ${specName}`);
    return;
  }

  items.forEach((item) => {
    const description = item.description ? ` - ${item.description}` : "";
    console.log(`${item.name} (${item.action}) ${item.channel}${description}`);
  });
}
