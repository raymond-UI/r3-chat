// AI Models available through OpenRouter
export const AI_MODELS = {
    "openai/gpt-4.1": {
      name: "GPT-4.1",
      provider: "OpenAI",
      cost: "High",
      speed: "Medium",
      id: "openai/gpt-4.1"
    },
    "openai/gpt-4o-mini": {
      name: "GPT-4o Mini",
      provider: "OpenAI",
      cost: "Low",
      speed: "Medium",
      id: "openai/gpt-4o-mini"
    },
    "openai/gpt-3.5-turbo": {
      name: "GPT-3.5 Turbo",
      provider: "OpenAI", 
      cost: "Low",
      speed: "Fast",
      id: "openai/gpt-3.5-turbo"
    },
    "anthropic/claude-sonnet-4": {
      name: "Claude Sonnet 4",
      provider: "Anthropic",
      cost: "High",
      speed: "Medium",
      id: "anthropic/claude-sonnet-4"
    },
    "anthropic/claude-3.7-sonnet": {
      name: "Claude 3.7 Sonnet",
      provider: "Anthropic",
      cost: "Medium",
      speed: "Medium", 
      id: "anthropic/claude-3.7-sonnet"
    },
    "anthropic/claude-3.5-sonnet": {
      name: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      cost: "Medium",
      speed: "Medium", 
      id: "anthropic/claude-3.5-sonnet"
    },
    "anthropic/claude-3-haiku": {
      name: "Claude 3 Haiku",
      provider: "Anthropic",
      cost: "Medium",
      speed: "Fast",
      id: "anthropic/claude-3-haiku"
    },
    "gemini-2.5-pro": {
      name: "Gemini 2.5 Pro",
      provider: "Google",
      cost: "Medium",
      speed: "Fast",
      id: "google/gemini-2.5-pro"
    },
    "google/gemini-2.0-flash-001": {
      name: "Gemini 2.0 Flash",
      provider: "Google",
      cost: "Medium",
      speed: "Fast",
      id: "google/gemini-2.0-flash-001"
    },
    "meta-llama/llama-3.3-8b-instruct:free": {
      name: "Llama 3.3 (free)",
      provider: "Meta",
      cost: "Free",
      speed: "Medium",
      id: "meta-llama/llama-3.3-8b-instruct:free"
    }
  } as const;
  
  // Type for model keys
  export type ModelKey = keyof typeof AI_MODELS;
  
  // Type for model configuration
  export type ModelConfig = typeof AI_MODELS[ModelKey];
export interface AIModel {
  key: string;
  name: string;
  provider: string;
  cost: string;
  speed: string;
  id: string;
}

// Helper function to convert AI_MODELS to AIModel array
export function getAIModelsArray(): AIModel[] {
  return Object.entries(AI_MODELS).map(([key, model]) => ({
    key,
    ...model
  }));
}