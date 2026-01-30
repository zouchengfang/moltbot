import type { MoltbotConfig } from "../config/config.js";
import {
  DEEPSEEK_BASE_URL,
  DEEPSEEK_DEFAULT_MODEL_ID,
  DEEPSEEK_DEFAULT_MODEL_REF,
} from "./onboard-auth.models.js";
import { buildDeepseekProvider } from "../agents/models-config.providers.js";

export function applyDeepseekProviderConfig(cfg: MoltbotConfig): MoltbotConfig {
  const models = { ...cfg.agents?.defaults?.models };
  models[DEEPSEEK_DEFAULT_MODEL_REF] = {
    ...models[DEEPSEEK_DEFAULT_MODEL_REF],
    alias: models[DEEPSEEK_DEFAULT_MODEL_REF]?.alias ?? "DeepSeek",
  };

  const providers = { ...cfg.models?.providers };
  const existingProvider = providers.deepseek;
  const built = buildDeepseekProvider();
  const existingModels = Array.isArray(existingProvider?.models) ? existingProvider.models : [];
  const hasDefaultModel = existingModels.some((m) => m.id === DEEPSEEK_DEFAULT_MODEL_ID);
  const mergedModels =
    existingModels.length > 0
      ? hasDefaultModel
        ? existingModels
        : [
            ...existingModels,
            ...built.models.filter((m) => !existingModels.some((e) => e.id === m.id)),
          ]
      : built.models;
  const { apiKey: existingApiKey, ...existingProviderRest } = (existingProvider ?? {}) as Record<
    string,
    unknown
  > as { apiKey?: string };
  const resolvedApiKey = typeof existingApiKey === "string" ? existingApiKey : undefined;
  const normalizedApiKey = resolvedApiKey?.trim();
  providers.deepseek = {
    ...existingProviderRest,
    baseUrl: DEEPSEEK_BASE_URL,
    api: "openai-completions",
    ...(normalizedApiKey ? { apiKey: normalizedApiKey } : {}),
    models: mergedModels.length > 0 ? mergedModels : built.models,
  };

  return {
    ...cfg,
    agents: {
      ...cfg.agents,
      defaults: {
        ...cfg.agents?.defaults,
        models,
      },
    },
    models: {
      mode: cfg.models?.mode ?? "merge",
      providers,
    },
  };
}

export function applyDeepseekConfig(cfg: MoltbotConfig): MoltbotConfig {
  const next = applyDeepseekProviderConfig(cfg);
  const existingModel = next.agents?.defaults?.model;
  return {
    ...next,
    agents: {
      ...next.agents,
      defaults: {
        ...next.agents?.defaults,
        model: {
          ...(existingModel && "fallbacks" in (existingModel as Record<string, unknown>)
            ? {
                fallbacks: (existingModel as { fallbacks?: string[] }).fallbacks,
              }
            : undefined),
          primary: DEEPSEEK_DEFAULT_MODEL_REF,
        },
      },
    },
  };
}
