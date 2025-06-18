// AI Models available through OpenRouter

export enum Provider {
  OpenAI = "OpenAI",
  Anthropic = "Anthropic",
  Google = "Google",
  Meta = "Meta",
  OpenRouter = "OpenRouter",
}

export const AI_MODELS = {
  "openai/gpt-4.1": {
    name: "GPT-4.1",
    provider: Provider.OpenAI,
    cost: "High",
    speed: "Medium",
    id: "openai/gpt-4.1",
    supportVision: true,
    search: false,
  },
  "openai/gpt-4o-mini": {
    name: "GPT-4o Mini",
    provider: Provider.OpenAI,
    cost: "Low",
    speed: "Medium",
    id: "openai/gpt-4o-mini",
    supportVision: true,
    search: false,
  },
  "openai/gpt-4o-mini-search-preview": {
    name: "GPT-4o Mini Search",
    provider: Provider.OpenAI,
    cost: "Medium",
    speed: "Medium",
    id: "openai/gpt-4o-mini-search-preview",
    supportVision: true,
    search: true,
  },
  "openai/gpt-3.5-turbo": {
    name: "GPT-3.5 Turbo",
    provider: Provider.OpenAI,
    cost: "Low",
    speed: "Fast",
    id: "openai/gpt-3.5-turbo",
    supportVision: false,
    search: false,
  },
  "anthropic/claude-sonnet-4": {
    name: "Claude Sonnet 4",
    provider: Provider.Anthropic,
    cost: "High",
    speed: "Medium",
    id: "anthropic/claude-sonnet-4",
    supportVision: true,
    search: false,
  },
  "anthropic/claude-3.7-sonnet": {
    name: "Claude 3.7 Sonnet",
    provider: Provider.Anthropic,
    cost: "Medium",
    speed: "Medium",
    id: "anthropic/claude-3.7-sonnet",
    supportVision: true,
    search: false,
  },
  "anthropic/claude-3.5-sonnet": {
    name: "Claude 3.5 Sonnet",
    provider: Provider.Anthropic,
    cost: "Medium",
    speed: "Medium",
    id: "anthropic/claude-3.5-sonnet",
    supportVision: true,
    search: false,
  },
  "anthropic/claude-3-haiku": {
    name: "Claude 3 Haiku",
    provider: Provider.Anthropic,
    cost: "Medium",
    speed: "Fast",
    id: "anthropic/claude-3-haiku",
    supportVision: false,
    search: false,
  },
  "gemini-2.5-pro": {
    name: "Gemini 2.5 Pro",
    provider: Provider.Google,
    cost: "Medium",
    speed: "Fast",
    id: "google/gemini-2.5-pro",
    supportVision: true,
    search: false,
  },
  "google/gemini-2.0-flash-001": {
    name: "Gemini 2.0 Flash",
    provider: Provider.Google,
    cost: "Medium",
    speed: "Fast",
    id: "google/gemini-2.0-flash-001",
    supportVision: true,
    search: true,
  },
  "google/gemini-2.0-flash-exp:free": {
    name: "Gemini 2.0 Flash (free)",
    provider: Provider.OpenRouter,
    cost: "Free",
    speed: "Medium",
    id: "google/gemini-2.0-flash-exp:free",
    supportVision: false,
    search: false,
  },
  "meta-llama/llama-3.3-8b-instruct:free": {
    name: "Llama 3.3 (free)",
    provider: Provider.OpenRouter,
    cost: "Free",
    speed: "Medium",
    id: "meta-llama/llama-3.3-8b-instruct:free",
    supportVision: false,
    search: false,
  },
} as const;

// Type for model keys
export type ModelKey = keyof typeof AI_MODELS;

// Type for model configuration
export type ModelConfig = (typeof AI_MODELS)[ModelKey];

export interface AIModel {
  key: string;
  name: string;
  provider: string;
  cost: string;
  speed: string;
  id: string;
  supportVision: boolean;
  search?: boolean;
}

// Helper function to convert AI_MODELS to AIModel array
export function getAIModelsArray(): AIModel[] {
  return Object.entries(AI_MODELS).map(([key, model]) => ({
    key,
    ...model,
  }));
}

// Helper function to get models with vision support
export function getVisionCapableModels(): AIModel[] {
  return getAIModelsArray().filter((model) => model.supportVision);
}

// Helper function to get models without vision support
export function getTextOnlyModels(): AIModel[] {
  return getAIModelsArray().filter((model) => !model.supportVision);
}
