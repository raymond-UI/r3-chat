import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "@/env";
import { AI_MODELS } from "@/types/ai";
import type { LanguageModel } from "ai";

// Provider configuration types
export type Provider = 'openai' | 'anthropic' | 'google' | 'openrouter';
export type KeySource = 'user-direct' | 'user-openrouter' | 'system-default';
export type KeyConfiguration = 'default' | 'own-openrouter' | 'mixed' | 'direct-only';

export interface ProviderConfig {
  provider: Provider;
  apiKey: string;
  baseURL?: string;
  model: string;
  source: KeySource;
}

export interface UserApiKeys {
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  openrouterKey?: string;
}

export interface UserAiPreferences {
  defaultProviders?: {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    openrouter: boolean;
  };
  defaultModels?: {
    chat: string;
    vision: string;
    coding: string;
  };
  keyConfiguration?: KeyConfiguration;
}

// Model to provider mapping based on existing AI_MODELS
export const MODEL_PROVIDERS: Record<string, Provider> = Object.keys(AI_MODELS).reduce((acc, modelId) => {
  const model = AI_MODELS[modelId as keyof typeof AI_MODELS];
  
  // Map provider names from AI_MODELS to our Provider types
  switch (model.provider) {
    case "OpenAI":
      acc[modelId] = "openai";
      break;
    case "Anthropic":
      acc[modelId] = "anthropic";
      break;
    case "Google":
      acc[modelId] = "google";
      break;
    case "Meta":
    default:
      // Default to OpenRouter for Meta and other providers
      acc[modelId] = "openrouter";
      break;
  }
  
  return acc;
}, {} as Record<string, Provider>);

// Get system default configuration
function getSystemDefaultConfig(modelId: string): ProviderConfig {
  return {
    provider: 'openrouter',
    apiKey: env.OPENROUTER_API_KEY!,
    baseURL: 'https://openrouter.ai/api/v1',
    model: modelId,
    source: 'system-default'
  };
}

// Normalize model ID for direct provider usage
function normalizeModelId(modelId: string, provider: Provider): string {
  switch (provider) {
    case 'openai':
      // Remove openai/ prefix if present
      return modelId.replace(/^openai\//, '');
    case 'anthropic':
      // Remove anthropic/ prefix and map to Claude API names
      if (modelId.includes('claude-3.5-sonnet')) return 'claude-3-5-sonnet-20241022';
      if (modelId.includes('claude-3-haiku')) return 'claude-3-haiku-20240307';
      return modelId.replace(/^anthropic\//, '');
    case 'google':
      // Remove google/ prefix if present
      return modelId.replace(/^google\//, '');
    default:
      return modelId;
  }
}

// Simplified provider configuration resolver
// Logic: Provider key → OpenRouter key → System key
export async function getProviderConfig(
  userKeys: UserApiKeys | null,
  userPrefs: UserAiPreferences | null,
  modelId: string
): Promise<ProviderConfig> {
  const modelProvider = MODEL_PROVIDERS[modelId];
  
  // If no provider mapping found, use OpenRouter
  if (!modelProvider) {
    return getSystemDefaultConfig(modelId);
  }

  // Check if user wants to use their direct provider key as default for this provider
  const useDirectProvider = userPrefs?.defaultProviders?.[modelProvider] && userKeys?.[`${modelProvider}Key` as keyof UserApiKeys];
  
  if (useDirectProvider) {
    return {
      provider: modelProvider,
      apiKey: userKeys![`${modelProvider}Key` as keyof UserApiKeys]!,
      model: normalizeModelId(modelId, modelProvider),
      source: 'user-direct'
    };
  }

  // Fallback to user's OpenRouter key if available
  if (userKeys?.openrouterKey) {
    return {
      provider: 'openrouter',
      apiKey: userKeys.openrouterKey,
      baseURL: 'https://openrouter.ai/api/v1',
      model: modelId,
      source: 'user-openrouter'
    };
  }

  // Final fallback to system default
  return getSystemDefaultConfig(modelId);
}

// Create AI provider instance based on configuration
export function createProviderInstance(config: ProviderConfig) {
  switch (config.provider) {
    case 'openai':
      return createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
    
    case 'anthropic':
      return createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
    
    case 'google':
      return createGoogleGenerativeAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      });
    
    case 'openrouter':
    default:
      return createOpenRouter({
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      });
  }
}

// Type for a generic provider function
type ProviderFunction = (model: string) => LanguageModel;

// Get model instance ready for AI SDK
export async function getModelInstance(
  userKeys: UserApiKeys | null,
  userPrefs: UserAiPreferences | null,
  modelId: string
): Promise<LanguageModel> {
  const modelProvider = MODEL_PROVIDERS[modelId];

  // Check if model exists
  if (!modelProvider) {
    throw new Error(`Model '${modelId}' is not supported. Please select a valid model.`);
  }

  // Check if user has configured direct provider key
  const hasDirectKey = userKeys?.[`${modelProvider}Key` as keyof UserApiKeys];
  const wantsDirectProvider = userPrefs?.defaultProviders?.[modelProvider];

  // If user wants direct provider but doesn't have key
  if (wantsDirectProvider && !hasDirectKey) {
    throw new Error(
      `You have configured ${modelProvider} as your default provider but haven't added an API key. ` +
      `Please add your ${modelProvider} API key in Settings or switch to a different provider.`
    );
  }

  // If no direct key and no OpenRouter key
  const modelData = AI_MODELS[modelId as keyof typeof AI_MODELS];
  const isFree = modelData && modelData.cost === "Free";
  if (!hasDirectKey && !userKeys?.openrouterKey) {
    if (isFree) {
      // Allow free models to proceed using system OpenRouter key
      const config = getSystemDefaultConfig(modelId);
      const provider = createProviderInstance(config);
      return (provider as ProviderFunction)(config.model);
    }
    throw new Error(
      `No API keys available for model '${modelId}'. ` +
      `Please add either a ${modelProvider} API key or an OpenRouter API key in Settings.`
    );
  }

  const config = await getProviderConfig(userKeys, userPrefs, modelId);
  const provider = createProviderInstance(config);

  // Type assertion to handle union type properly
  return (provider as ProviderFunction)(config.model);
}

// Utility to check if a provider supports a specific model
export function isModelSupported(modelId: string, provider: Provider): boolean {
  const modelProvider = MODEL_PROVIDERS[modelId];
  return modelProvider === provider || provider === 'openrouter';
}

// Get cost multiplier for different sources (rough estimates)
export function getCostMultiplier(source: KeySource, provider: Provider): number {
  if (source === 'system-default') return 1.0;
  if (source === 'user-openrouter') return 1.0;
  
  // Direct provider cost savings estimates
  switch (provider) {
    case 'openai': return 0.8; // ~20% savings
    case 'anthropic': return 0.85; // ~15% savings
    case 'google': return 0.9; // ~10% savings
    default: return 1.0;
  }
}

// // Get available models with key status information
// export function getAvailableModels(
//   userKeys: UserApiKeys | null,
//   userPrefs: UserAiPreferences | null
// ) {
//   return Object.entries(AI_MODELS).map(([modelId, modelData]) => {
//     const provider = MODEL_PROVIDERS[modelId];
//     const availableSources: Array<{
//       type: KeySource;
//       configured: boolean;
//       costMultiplier?: number;
//     }> = [];

//     // Check system default availability
//     availableSources.push({
//       type: 'system-default',
//       configured: true,
//       costMultiplier: getCostMultiplier('system-default', provider),
//     });

//     // Check user's OpenRouter key
//     if (userKeys?.openrouterKey) {
//       availableSources.push({
//         type: 'user-openrouter',
//         configured: true,
//         costMultiplier: getCostMultiplier('user-openrouter', provider),
//       });
//     }

//     // Check direct provider key
//     const providerKey = userKeys?.[`${provider}Key` as keyof UserApiKeys];
//     if (providerKey) {
//       availableSources.push({
//         type: 'user-direct',
//         configured: true,
//         costMultiplier: getCostMultiplier('user-direct', provider),
//       });
//     }

//     // Determine current source based on simplified logic
//     let currentSource: KeySource = 'system-default';
//     const available = true;

//     // Use the simplified logic: Provider key → OpenRouter key → System key
//     const useDirectProvider = userPrefs?.defaultProviders?.[provider] && providerKey;
    
//     if (useDirectProvider) {
//       currentSource = 'user-direct';
//     } else if (userKeys?.openrouterKey) {
//       currentSource = 'user-openrouter';
//     } else {
//       currentSource = 'system-default';
//     }

//     return {
//       modelId,
//       name: modelData.name,
//       provider,
//       availableSources,
//       currentSource,
//       available,
//       modelData, // Include original model data
//     };
//   });
// }

// // Helper to check if a specific model is available with current configuration
// export function isModelAvailable(
//   modelId: string,
//   userKeys: UserApiKeys | null,
//   userPrefs: UserAiPreferences | null
// ): boolean {
//   try {
//     const models = getAvailableModels(userKeys, userPrefs);
//     const model = models.find(m => m.modelId === modelId);
//     return model?.available ?? false;
//   } catch {
//     return false;
//   }
// }

// Simplified model availability for better UX
export interface ModelAvailability {
  modelId: string;
  name: string;
  provider: Provider;
  modelData: typeof AI_MODELS[keyof typeof AI_MODELS];
  available: boolean;
  source: 'system' | 'openrouter' | 'provider';
  requiresUpgrade: boolean;
  isFree: boolean;
}

export function getModelAvailability(
  userKeys: UserApiKeys | null,
  userPrefs: UserAiPreferences | null = null
): ModelAvailability[] {
  return Object.entries(AI_MODELS).map(([modelId, modelData]) => {
    const provider = MODEL_PROVIDERS[modelId];
    const isFree = modelData.cost === "Free";
    const hasOpenRouter = !!userKeys?.openrouterKey;
    const providerKey = userKeys?.[`${provider}Key` as keyof UserApiKeys];
    const hasProviderKey = !!providerKey;
    const useDirectProvider = userPrefs?.defaultProviders?.[provider] && hasProviderKey;

    // Simple availability logic
    const available = isFree || hasOpenRouter || hasProviderKey;
    const requiresUpgrade = !isFree && !hasOpenRouter && !hasProviderKey;

    // Determine source
    let source: 'system' | 'openrouter' | 'provider' = 'system';
    if (useDirectProvider) {
      source = 'provider';
    } else if (hasOpenRouter && !isFree) {
      source = 'openrouter';
    }

    return {
      modelId,
      name: modelData.name,
      provider,
      modelData,
      available,
      source,
      requiresUpgrade,
      isFree,
    };
  });
}

// Get only available models for the user
export function getAvailableModelsSimple(
  userKeys: UserApiKeys | null,
  userPrefs: UserAiPreferences | null = null
): ModelAvailability[] {
  return getModelAvailability(userKeys, userPrefs).filter(m => m.available);
}

// Get models that require upgrade
export function getUpgradeRequiredModels(
  userKeys: UserApiKeys | null,
  userPrefs: UserAiPreferences | null = null
): ModelAvailability[] {
  return getModelAvailability(userKeys, userPrefs).filter(m => m.requiresUpgrade);
} 