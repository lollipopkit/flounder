import type { Model } from "@earendil-works/pi-ai";

// UI/config-facing provider id: shown as its own type in the provider list.
export const OPENAI_COMPAT_PROVIDER = "openai-compatible";
// Internal provider id stamped on the model object. pi-ai routes auth/base-url
// off model.provider (getEnvApiKey -> OPENAI_API_KEY), so this MUST stay a
// provider pi-ai knows ("openai"); only the outward-facing label is decoupled.
const OPENAI_COMPAT_MODEL_PROVIDER = "openai";

export function configureOpenAICompatibleEnv(): void {
  const apiKey = clean(process.env.FLOUNDER_OPENAI_COMPAT_API_KEY);
  if (apiKey && !process.env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = apiKey;
}

export function openAICompatibleConfigured(): boolean {
  return Boolean(openAICompatibleBaseUrl() && openAICompatibleModelId());
}

export function openAICompatibleModelId(): string | undefined {
  return clean(process.env.FLOUNDER_OPENAI_COMPAT_MODEL);
}

export function openAICompatibleBaseUrl(): string | undefined {
  return clean(process.env.FLOUNDER_OPENAI_COMPAT_BASE_URL);
}

export function getOpenAICompatibleModel(provider: string, modelId?: string): Model<"openai-completions"> | undefined {
  if (provider !== OPENAI_COMPAT_PROVIDER) return undefined;
  const id = openAICompatibleModelId();
  const baseUrl = openAICompatibleBaseUrl();
  if (!id || !baseUrl || modelId !== id) return undefined;
  return {
    id,
    name: process.env.FLOUNDER_OPENAI_COMPAT_NAME || `OpenAI-compatible ${id}`,
    api: "openai-completions",
    provider: OPENAI_COMPAT_MODEL_PROVIDER,
    baseUrl,
    reasoning: process.env.FLOUNDER_OPENAI_COMPAT_REASONING === "1",
    input: readInputModes(),
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: readPositiveInt(process.env.FLOUNDER_OPENAI_COMPAT_CONTEXT_WINDOW) ?? 128_000,
    maxTokens: readPositiveInt(process.env.FLOUNDER_OPENAI_COMPAT_MAX_TOKENS) ?? 16_384,
    compat: {
      supportsStore: false,
      supportsDeveloperRole: process.env.FLOUNDER_OPENAI_COMPAT_DEVELOPER_ROLE !== "0",
      supportsReasoningEffort: process.env.FLOUNDER_OPENAI_COMPAT_REASONING === "1",
      supportsStrictMode: false,
    },
  };
}

function readInputModes(): Array<"text" | "image"> {
  return process.env.FLOUNDER_OPENAI_COMPAT_IMAGE === "1" ? ["text", "image"] : ["text"];
}

function readPositiveInt(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
