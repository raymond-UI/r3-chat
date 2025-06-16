import { useCallback } from "react";
import { useMutation, useAction } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type {
  ProviderId,
  ApiKeyState,
  UserPreferences,
  DefaultProviders,
} from "../types/api-keys";
import { useQuery } from "@/cache/useQuery";

export function useApiKeys() {
  const { userId } = useAuth();

  const apiKeys = useQuery(
    api.userApiKeys.getUserApiKeys,
    userId ? { userId } : "skip"
  ) as ApiKeyState | undefined;

  const preferences = useQuery(
    api.userApiKeys.getUserAiPreferences,
    userId ? { userId } : "skip"
  ) as UserPreferences | undefined;

  const updatePreferences = useMutation(api.userApiKeys.updateAiPreferences);
  const updateApiKeysSecure = useAction(api.actions.apiKeyManager.updateApiKeysSecure);
  const validateApiKey = useAction(api.actions.apiKeyManager.validateApiKey);
  const getApiKeysMasked = useAction(api.actions.apiKeyManager.getApiKeysMasked);

  const handleSaveKey = useCallback(
    async (
      providerId: ProviderId,
      key: string,
      isDefault: boolean
    ): Promise<void> => {
      if (!userId) {
        toast.error("Please sign in to save API keys");
        return;
      }

      if (!key.trim()) {
        toast.error("API key cannot be empty");
        return;
      }

      try {
        // First validate the API key format
        const isValid = await validateApiKey({
          provider: providerId,
          apiKey: key.trim(),
        });

        if (!isValid) {
          toast.error(`Invalid ${providerId} API key format. Please check your key.`);
          return;
        }

        // Update preferences for default provider
        const currentDefaults: DefaultProviders =
          preferences?.defaultProviders ?? {
            openai: false,
            anthropic: false,
            google: false,
            openrouter: false,
          };

        await updatePreferences({
          userId,
          defaultProviders: {
            ...currentDefaults,
            [providerId]: isDefault,
          },
        });

        // Store the encrypted API key securely
        const keyArgs: Record<string, string> = {};
        keyArgs[`${providerId}Key`] = key.trim();

        await updateApiKeysSecure({
          userId,
          ...keyArgs,
        });

        toast.success(`${providerId} API key saved successfully`);
      } catch (error) {
        console.error("Failed to save API key:", error);
        toast.error("Failed to save API key. Please try again.");
      }
    },
    [userId, preferences?.defaultProviders, updatePreferences, updateApiKeysSecure, validateApiKey]
  );

  const handleDeleteKey = useCallback(
    async (providerId: ProviderId): Promise<void> => {
      if (!userId) {
        toast.error("Please sign in to delete API keys");
        return;
      }

      try {
        // Update preferences to remove default status
        const currentDefaults: DefaultProviders =
          preferences?.defaultProviders ?? {
            openai: false,
            anthropic: false,
            google: false,
            openrouter: false,
          };

        await updatePreferences({
          userId,
          defaultProviders: {
            ...currentDefaults,
            [providerId]: false,
          },
        });

        // Delete the encrypted API key by passing an empty string
        const keyArgs: Record<string, string> = {};
        keyArgs[`${providerId}Key`] = "";

        await updateApiKeysSecure({
          userId,
          ...keyArgs,
        });

        toast.success(`${providerId} API key removed successfully`);
      } catch (error) {
        console.error("Failed to delete API key:", error);
        toast.error("Failed to delete API key. Please try again.");
      }
    },
    [userId, preferences?.defaultProviders, updatePreferences, updateApiKeysSecure]
  );

  const getMaskedKey = useCallback(
    async (providerId: ProviderId): Promise<string | null> => {
      if (!userId) return null;
      
      try {
        const result = await getApiKeysMasked({ userId });
        if (!result) return null;
        
        return result.maskedKeys[`${providerId}Key`] || null;
      } catch (error) {
        console.error("Failed to get masked key:", error);
        return null;
      }
    },
    [userId, getApiKeysMasked]
  );

  return {
    userId,
    apiKeys,
    preferences,
    isLoading: apiKeys === undefined || preferences === undefined,
    handleSaveKey,
    handleDeleteKey,
    getMaskedKey,
  };
}
