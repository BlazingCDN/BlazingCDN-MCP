const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_ERROR_BODY = 2_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  query?: Record<string, unknown>;
  body?: unknown;
  formData?: FormData;
  timeoutMs?: number;
}

export class ApiClient {
  constructor(
    private readonly apiUrl: string,
    private readonly apiToken: string,
  ) {}

  async request(method: string, path: string, options: RequestOptions = {}): Promise<unknown> {
    const url = new URL(this.apiUrl + path);
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        const arrayKey = key.endsWith("[]") ? key : `${key}[]`;
        for (const item of value) url.searchParams.append(arrayKey, String(item));
      } else {
        url.searchParams.append(key, String(value));
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiToken}`,
      Accept: "application/json",
    };
    let body: BodyInit | undefined;
    if (options.formData) {
      body = options.formData;
    } else if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, { method, headers, body, signal: controller.signal });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiError(`Request timed out: ${method} ${path}`);
      }
      const reason = error instanceof Error ? error.message : String(error);
      throw new ApiError(`Network error calling ${method} ${path}: ${reason}`);
    } finally {
      clearTimeout(timer);
    }

    const text = await response.text();
    if (!response.ok) {
      const detail = text.slice(0, MAX_ERROR_BODY) || response.statusText;
      throw new ApiError(
        `BlazingCDN API error ${response.status} on ${method} ${path}: ${detail}`,
        response.status,
      );
    }
    if (!text) return { ok: true, status: response.status };
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  }

  get(path: string, query?: Record<string, unknown>) {
    return this.request("GET", path, { query });
  }

  post(path: string, body?: unknown, query?: Record<string, unknown>) {
    return this.request("POST", path, { body, query });
  }

  put(path: string, body?: unknown) {
    return this.request("PUT", path, { body });
  }

  delete(path: string, body?: unknown) {
    return this.request("DELETE", path, { body });
  }
}
