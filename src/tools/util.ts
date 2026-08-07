import { ApiError } from "../client.js";

const MAX_OUTPUT_CHARS = 60_000;

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

export function textResult(data: unknown): ToolResult {
  let text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  if (text.length > MAX_OUTPUT_CHARS) {
    text =
      text.slice(0, MAX_OUTPUT_CHARS) +
      `\n\n[Output truncated at ${MAX_OUTPUT_CHARS} characters. Use filters or pagination parameters to narrow the result.]`;
  }
  return { content: [{ type: "text", text }] };
}

export function toolHandler<Args>(fn: (args: Args) => Promise<unknown>) {
  return async (args: Args): Promise<ToolResult> => {
    try {
      return textResult(await fn(args));
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? `Unexpected error: ${error.message}`
            : String(error);
      return { content: [{ type: "text", text: message }], isError: true };
    }
  };
}

/** Drop undefined values so they are not serialized into request bodies. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const READ_ONLY = { readOnlyHint: true, openWorldHint: true };
export const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };
export const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: true };
