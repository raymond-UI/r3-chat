import type { ProviderId, ApiKeyState } from "../types/api-keys";

/**
 * Get the key name for checking if a provider has an API key
 */
function getProviderKeyName(providerId: ProviderId): keyof ApiKeyState {
  const keyName =
    `has${providerId.charAt(0).toUpperCase() + providerId.slice(1)}Key` as const;
  return keyName as keyof ApiKeyState;
}

/**
 * Check if a provider has an API key configured
 */
export function hasProviderKey(
  apiKeys: ApiKeyState | undefined,
  providerId: ProviderId
): boolean {
  if (!apiKeys) return false;
  const keyName = getProviderKeyName(providerId);
  return Boolean(apiKeys[keyName]);
}

/**
 * Validate API key format (basic validation)
 */
export function validateApiKey(key: string, providerId: ProviderId): boolean {
  if (!key || key.trim().length === 0) return false;

  // Basic validation patterns for different providers
  const patterns: Record<ProviderId, RegExp> = {
    openai: /^sk-[a-zA-Z0-9]{48,}$/,
    anthropic: /^sk-ant-[a-zA-Z0-9-_]{95,}$/,
    google: /^[a-zA-Z0-9-_]{39}$/,
    openrouter: /^sk-or-[a-zA-Z0-9-_]{32,}$/,
  };

  const pattern = patterns[providerId];
  return pattern ? pattern.test(key.trim()) : key.trim().length > 10;
}

/**
 * Mask API key for display purposes
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 10) return "••••••••••••••••";
  return key.substring(0, 6) + "••••••••••••" + key.substring(key.length - 4);
}
