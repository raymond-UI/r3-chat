import { AI_MODELS } from "@/types/ai";
import { UserApiKeys, UserAiPreferences } from "@/types/providers";
import { getAvailableModelsSimple } from "./providers";

/**
 * Get the appropriate default model based on user configuration and preferences
 */
export function getDefaultModel(
  userKeys: UserApiKeys | null = null,
  userPrefs: UserAiPreferences | null = null,
  context: "chat" | "vision" | "coding" = "chat"
): string {
  // 1. Check user's default model preferences first
  if (userPrefs?.defaultModels?.[context]) {
    const preferredModel = userPrefs.defaultModels[context];
    // Verify the model exists and is available
    if (AI_MODELS[preferredModel as keyof typeof AI_MODELS]) {
      return preferredModel;
    }
  }

  // 2. Get available models based on user configuration
  const availableModels = getAvailableModelsSimple(userKeys, userPrefs);
  const accessibleModels = availableModels;

  // 3. Smart defaults based on user's API key configuration
  if (userKeys?.openaiKey || (!userKeys && !userPrefs)) {
    // User has OpenAI key or no configuration (system default)
    const openAIDefaults = {
      chat: "openai/gpt-4o-mini",
      vision: "openai/gpt-4o-mini", 
      coding: "openai/gpt-4o-mini"
    };
    const defaultModel = openAIDefaults[context];
    if (accessibleModels.some((m: { modelId: string }) => m.modelId === defaultModel)) {
      return defaultModel;
    }
  }

  // 4. Check for other provider-specific defaults
  if (userKeys?.anthropicKey) {
    const anthropicDefaults = {
      chat: "anthropic/claude-3.5-sonnet",
      vision: "anthropic/claude-3.5-sonnet",
      coding: "anthropic/claude-3.5-sonnet"
    };
    const defaultModel = anthropicDefaults[context];
    if (accessibleModels.some((m: { modelId: string }) => m.modelId === defaultModel)) {
      return defaultModel;
    }
  }

  if (userKeys?.googleKey) {
    const googleDefaults = {
      chat: "google/gemini-2.0-flash-001",
      vision: "google/gemini-2.0-flash-001", 
      coding: "google/gemini-2.0-flash-001"
    };
    const defaultModel = googleDefaults[context];
    if (accessibleModels.some((m: { modelId: string }) => m.modelId === defaultModel)) {
      return defaultModel;
    }
  }

  // 5. Free model fallbacks (always available through system OpenRouter)
  const freeModelDefaults = {
    chat: "meta-llama/llama-3.3-8b-instruct:free",
    vision: "google/gemini-2.0-flash-exp:free",
    coding: "meta-llama/llama-3.3-8b-instruct:free" // Llama better for coding
  };

  const freeDefault = freeModelDefaults[context];
  if (accessibleModels.some((m: { modelId: string }) => m.modelId === freeDefault)) {
    return freeDefault;
  }

  // 6. Ultimate fallback - first available model
  if (accessibleModels.length > 0) {
    return accessibleModels[0].modelId;
  }

  // 7. Last resort - hardcoded fallback
  return "google/gemini-2.0-flash-exp:free";
}

/**
 * Get default model for server-side usage (API routes)
 */
export async function getDefaultModelForUser(
  userId?: string,
  context: "chat" | "vision" | "coding" = "chat"
): Promise<string> {
  if (!userId) {
    // Anonymous user - use free model
    return getDefaultModel(null, null, context);
  }

  // For server-side, we'd need to query user configuration
  // This would require Convex context, so we'll keep it simple for now
  return getDefaultModel(null, null, context);
}

/**
 * Get a sensible fallback model that's always available
 */
export function getFallbackModel(context: "chat" | "vision" | "coding" = "chat"): string {
  const fallbacks = {
    chat: "google/gemini-2.0-flash-exp:free",
    vision: "google/gemini-2.0-flash-exp:free",
    coding: "google/gemini-2.0-flash-exp:free"
  };
  
  return fallbacks[context];
} 