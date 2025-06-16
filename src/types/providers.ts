// Re-export types from providers.ts for better organization
import type {
  Provider,
  KeySource,
  KeyConfiguration,
  ProviderConfig,
  UserApiKeys,
  UserAiPreferences,
} from "@/lib/providers";

export type {
  Provider,
  KeySource,
  KeyConfiguration,
  ProviderConfig,
  UserApiKeys,
  UserAiPreferences,
};

// Additional types for UI components
export interface ModelAvailability {
  modelId: string;
  name: string;
  provider: Provider;
  availableSources: Array<{
    type: KeySource;
    configured: boolean;
    costMultiplier?: number;
  }>;
  currentSource: KeySource;
  available: boolean;
  estimatedCost?: {
    inputTokens: number; // cents per 1K tokens
    outputTokens: number; // cents per 1K tokens
  };
}

export interface KeyValidationStatus {
  provider: Provider;
  isValid: boolean;
  lastChecked: number;
  error?: string;
  testing?: boolean;
}

export interface ConfigurationStrategy {
  id: KeyConfiguration;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  recommended: boolean;
  complexity: 'low' | 'medium' | 'high';
}

// Configuration wizard state
export interface ConfigurationWizardState {
  currentStep: number;
  selectedStrategy?: KeyConfiguration;
  apiKeys: Partial<UserApiKeys>;
  preferences: Partial<UserAiPreferences>;
  validationResults: Record<Provider, KeyValidationStatus>;
  completed: boolean;
}

// Provider health status
export interface ProviderHealth {
  provider: Provider;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheck: number;
  responseTime?: number;
  error?: string;
} 