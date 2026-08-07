export interface Config {
  apiToken: string;
  apiUrl: string;
  allowWrite: boolean;
  allowDelete: boolean;
}

const TRUTHY = new Set(["1", "true", "yes", "on"]);

function flag(value: string | undefined): boolean {
  return value !== undefined && TRUTHY.has(value.trim().toLowerCase());
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    apiToken: env.BLAZINGCDN_API_TOKEN?.trim() ?? "",
    apiUrl: (env.BLAZINGCDN_API_URL?.trim() || "https://wapi.blazingcdn.com").replace(/\/+$/, ""),
    allowWrite: flag(env.BLAZINGCDN_ALLOW_WRITE),
    allowDelete: flag(env.BLAZINGCDN_ALLOW_DELETE),
  };
}
