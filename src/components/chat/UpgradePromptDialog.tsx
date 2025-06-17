"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SimpleModelAvailability } from "@/lib/providers";
import { Key, Lock, Shield, Sparkles } from "lucide-react";
import { useState, useCallback } from "react";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { useApiKeys } from "@/hooks/useApiKeys";
import { hasProviderKey } from "@/utils/api-keys";
import { PROVIDERS } from "@/config/providers";
import type { Provider, ProviderId } from "@/types/api-keys";

interface UpgradePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel?: SimpleModelAvailability;
  upgradeCount: number;
}

export function UpgradePromptDialog({
  open,
  onOpenChange,
  selectedModel,
  upgradeCount,
}: UpgradePromptDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [selectedProviderMaskedKey, setSelectedProviderMaskedKey] = useState<string | null>(null);

  const {
    apiKeys,
    preferences,
    handleSaveKey,
    handleDeleteKey,
    getMaskedKey,
  } = useApiKeys();

  const handleProviderSetup = useCallback(async (providerId: ProviderId) => {
    const provider = PROVIDERS.find(p => p.id === providerId);
    if (!provider) return;

    setSelectedProvider(provider);
    
    // Get masked key if available
    if (getMaskedKey) {
      const maskedKey = await getMaskedKey(providerId);
      setSelectedProviderMaskedKey(maskedKey);
    }
    
    setApiKeyDialogOpen(true);
  }, [getMaskedKey]);

  const handleOpenRouterSetup = useCallback(() => {
    handleProviderSetup('openrouter');
  }, [handleProviderSetup]);

  const handleDirectProviderSetup = useCallback(() => {
    if (selectedModel?.provider) {
      // Convert string to ProviderId if it's a valid provider
      const providerId = selectedModel.provider as ProviderId;
      if (['openai', 'anthropic', 'google', 'openrouter'].includes(providerId)) {
        handleProviderSetup(providerId);
      }
    }
  }, [selectedModel?.provider, handleProviderSetup]);

  const handleApiKeySave = useCallback(
    async (key: string, isDefault: boolean) => {
      if (!selectedProvider) return;
      await handleSaveKey(selectedProvider.id, key, isDefault);
      setApiKeyDialogOpen(false);
      setSelectedProvider(null);
      setSelectedProviderMaskedKey(null);
      // Optionally close the upgrade dialog too
      onOpenChange(false);
    },
    [selectedProvider, handleSaveKey, onOpenChange]
  );

  const handleApiKeyDelete = useCallback(async () => {
    if (!selectedProvider) return;
    await handleDeleteKey(selectedProvider.id);
    setApiKeyDialogOpen(false);
    setSelectedProvider(null);
    setSelectedProviderMaskedKey(null);
  }, [selectedProvider, handleDeleteKey]);

  const handleApiKeyDialogClose = useCallback((open: boolean) => {
    setApiKeyDialogOpen(open);
    if (!open) {
      setSelectedProvider(null);
      setSelectedProviderMaskedKey(null);
    }
  }, []);

  const getModelIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "openai":
        return "🤖";
      case "anthropic":
        return "🧠";
      case "google":
        return "🔍";
      case "meta":
        return "🦙";
      default:
        return "✨";
    }
  };

  const getProviderName = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "openai":
        return "OpenAI";
      case "anthropic":
        return "Anthropic";
      case "google":
        return "Google";
      case "meta":
        return "Meta";
      default:
        return provider.charAt(0).toUpperCase() + provider.slice(1);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Unlock {selectedModel?.name || "Premium Models"}
            </DialogTitle>
            <DialogDescription>
              {selectedModel
                ? `${selectedModel.name} requires an API key to access. Choose your preferred method below.`
                : `${upgradeCount} premium models are waiting for you. Add an API key to unlock them.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Selected Model Info */}
            {selectedModel && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {getModelIcon(selectedModel.provider)}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{selectedModel.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedModel.provider} • {selectedModel.modelData.cost}{" "}
                      cost • {selectedModel.modelData.speed} speed
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedModel.modelData.cost}
                  </Badge>
                </div>
              </div>
            )}

            {/* Upgrade Options */}
            <div className="space-y-3">
              <div className="text-sm font-medium">
                Choose your access method:
              </div>

              {/* Direct Provider Option - Show only if this model is available from a specific provider */}
              {selectedModel && selectedModel.provider !== "openrouter" && (
                <Button
                  onClick={handleDirectProviderSetup}
                  className="w-full justify-start h-auto p-4"
                  variant="secondary"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                      <Shield className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">
                        Add {getProviderName(selectedModel.provider)} Key
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Best pricing • Direct access to{" "}
                        {getProviderName(selectedModel.provider)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs text-green-600">
                      Best Price
                    </Badge>
                  </div>
                </Button>
              )}

              {/* OpenRouter Option */}
              <Button
                onClick={handleOpenRouterSetup}
                className="w-full justify-start h-auto p-4"
                variant={
                  selectedModel && selectedModel.provider !== "openrouter"
                    ? "outline"
                    : "default"
                }
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Key className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Add OpenRouter Key</div>
                    <div className="text-xs text-muted-foreground">
                      Access 100+ models from one API key
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-blue-600">
                    Most Convenient
                  </Badge>
                </div>
              </Button>

              {/* Premium Option (Placeholder) */}
              <Button
                variant="outline"
                disabled
                className="w-full justify-start h-auto p-4 opacity-60"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Upgrade to Premium</div>
                    <div className="text-xs text-muted-foreground">
                      No API keys needed • Priority support
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                </div>
              </Button>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              {/* Direct Provider Benefits - Show only if specific provider */}
              {selectedModel && selectedModel.provider !== "openrouter" && (
                <div className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                  <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                    With {getProviderName(selectedModel.provider)} Direct:
                  </div>
                  <ul className="text-xs text-green-700 dark:text-green-300 space-y-1">
                    <li className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      Best possible pricing
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      Direct API access
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      Full feature support
                    </li>
                  </ul>
                </div>
              )}

              {/* OpenRouter Benefits */}
              <div className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  With OpenRouter:
                </div>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <Key className="h-3 w-3" />
                    Access to 100+ AI models
                  </li>
                  <li className="flex items-center gap-2">
                    <Key className="h-3 w-3" />
                    Single API key for everything
                  </li>
                  <li className="flex items-center gap-2">
                    <Key className="h-3 w-3" />
                    Easy to get started
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Key Dialog */}
      {selectedProvider && (
        <ApiKeyDialog
          provider={selectedProvider}
          hasKey={hasProviderKey(apiKeys, selectedProvider.id)}
          isDefault={
            preferences?.defaultProviders?.[selectedProvider.id] ?? false
          }
          maskedKey={selectedProviderMaskedKey}
          onSave={handleApiKeySave}
          onDelete={handleApiKeyDelete}
          open={apiKeyDialogOpen}
          onOpenChange={handleApiKeyDialogClose}
        />
      )}
    </>
  );
}
