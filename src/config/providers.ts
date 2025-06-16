import type { Provider } from "../types/api-keys";

export const PROVIDERS: readonly Provider[] = [
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4, DALL-E, and Whisper models",
    website: "https://platform.openai.com/api-keys",
    models: ["GPT-4o", "GPT-4o Mini", "DALL-E 3"],
    benefits: ["Fastest responses", "Best for reasoning", "Image generation"],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude models for safe, helpful AI",
    website: "https://console.anthropic.com/settings/keys",
    models: ["Claude 3.5 Sonnet", "Claude 3 Haiku"],
    benefits: ["Best for analysis", "Large context", "Safe outputs"],
  },
  {
    id: "google",
    name: "Google AI",
    description: "Gemini models and multimodal AI",
    website: "https://makersuite.google.com/app/apikey",
    models: ["Gemini Pro", "Gemini Pro Vision"],
    benefits: ["Multimodal AI", "Fast inference", "Free tier available"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access 100+ models from different providers",
    website: "https://openrouter.ai/keys",
    models: ["100+ Models", "Llama", "Mistral", "Claude", "GPT"],
    benefits: ["Most variety", "Competitive pricing", "Unified API"],
  },
] as const;
