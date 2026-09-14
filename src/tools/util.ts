import { ApiError } from "../client.js";

const MAX_OUTPUT_CHARS = 60_000;

/** Customer panel: every setting the API exposes can also be switched there by the user. */
export const PANEL_URL = "https://client.blazingcdn.com";

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
          ? withNextStep(error)
          : error instanceof Error
            ? `Unexpected error: ${error.message}`
            : String(error);
      return { content: [{ type: "text", text: message }], isError: true };
    }
  };
}

/** Append the next step for API errors the agent cannot fix by retrying, so it does not fall back to "contact support". */
function withNextStep(error: ApiError): string {
  if (error.status === 401) {
    return (
      `${error.message}\nNext step: the API token is invalid or expired — ask the user to create a new one in the ` +
      `customer panel (${PANEL_URL}, Account → API tokens).`
    );
  }
  if (error.status === 409 && /basic mode/i.test(error.message)) {
    const id = error.message.match(/pull_zones\/([0-9a-f-]{36})/i)?.[1] ?? "<resource_id>";
    return (
      `${error.message}\nNext step: this resource is in the basic Locations Mode, where custom locations cannot be ` +
      "edited. Turning image processing on does not need them: use update_cdn_resource with " +
      "image_processing_enabled=true + image_processing_extensions (the same switch as Locations → Image processing " +
      "in the panel). For custom locations, ask the user whether to switch the resource to extended mode, then set " +
      "location_mode='extended' with update_cdn_resource — or let them switch 'Locations Mode' at " +
      `${PANEL_URL}/anycast_cdn/${id}/locations. This is a setting the user controls, not a support matter.`
    );
  }
  return error.message;
}

/** Drop undefined values so they are not serialized into request bodies. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

export const READ_ONLY = { readOnlyHint: true, openWorldHint: true };
export const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: true };
export const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: true };
