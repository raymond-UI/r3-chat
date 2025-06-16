"use client";

import { useState, useCallback, memo, useEffect } from "react";
import { PROVIDERS } from "../../config/providers";
import { useApiKeys } from "../../hooks/useApiKeys";
import { hasProviderKey } from "../../utils/api-keys";
import { ProviderCard } from "../../components/ProviderCard";
import { ApiKeyDialog } from "../../components/ApiKeyDialog";
import { LoadingState } from "../../components/LoadingState";
import { AlertCircle } from "lucide-react";
import type { Provider } from "../../types/api-keys";

export const ApiKeySettings = memo(() => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProviderMaskedKey, setSelectedProviderMaskedKey] = useState<string | null>(null);

  const {
    userId,
    apiKeys,
    preferences,
    isLoading,
    handleSaveKey,
    handleDeleteKey,
    getMaskedKey,
  } = useApiKeys();

  const handleProviderClick = useCallback((provider: Provider) => {
    setSelectedProvider(provider);
    setDialogOpen(true);
  }, []);

  // Fetch masked key when dialog opens for a provider
  useEffect(() => {
    if (selectedProvider && dialogOpen && getMaskedKey) {
      getMaskedKey(selectedProvider.id).then(maskedKey => {
        setSelectedProviderMaskedKey(maskedKey);
      });
    } else if (!dialogOpen) {
      // Reset masked key when dialog closes
      setSelectedProviderMaskedKey(null);
    }
  }, [selectedProvider, dialogOpen, getMaskedKey]);

  const handleSave = useCallback(
    async (key: string, isDefault: boolean) => {
      if (!selectedProvider) return;
      await handleSaveKey(selectedProvider.id, key, isDefault);
    },
    [selectedProvider, handleSaveKey]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedProvider) return;
    await handleDeleteKey(selectedProvider.id);
  }, [selectedProvider, handleDeleteKey]);

  if (!userId || isLoading) {
    return <LoadingState isAuthenticated={Boolean(userId)} />;
  }

  return (
    <div className="space-y-6">
      <header className="text-left">
        <h2 className="text-base font-semibold mb-2">API Key Configuration</h2>
        <p className="text-muted-foreground text-sm">
          Add your preferred API keys for better control, pricing, and rate
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PROVIDERS.map((provider) => {
          const hasKey = hasProviderKey(apiKeys, provider.id);
          const isDefault =
            preferences?.defaultProviders?.[provider.id] ?? false;

          return (
            <ProviderCard
              key={provider.id}
              provider={provider}
              hasKey={hasKey}
              isDefault={isDefault}
              onClick={() => handleProviderClick(provider)}
            />
          );
        })}
      </div>

      <InfoPanel />

      {selectedProvider && (
        <ApiKeyDialog
          provider={selectedProvider}
          hasKey={hasProviderKey(apiKeys, selectedProvider.id)}
          isDefault={
            preferences?.defaultProviders?.[selectedProvider.id] ?? false
          }
          maskedKey={selectedProviderMaskedKey}
          onSave={handleSave}
          onDelete={handleDelete}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
});

ApiKeySettings.displayName = "ApiKeySettings";



const InfoPanel = memo(() => (
  <div className="bg-muted p-4 rounded-lg">
    <h3 className="font-medium mb-2 flex items-center gap-2">
      <AlertCircle className="w-4 h-4" aria-hidden="true" />
      How API Key Fallback Works
    </h3>
    <div className="text-sm text-muted-foreground space-y-1">
      <div>
        1. <strong>Provider Key:</strong> If you mark a provider as default,
        we&apos;ll use your direct API key for that provider&apos;s models
      </div>
      <div>
        2. <strong>OpenRouter Key:</strong> If no direct key is set as default,
        we&apos;ll use your OpenRouter key (access to 100+ models)
      </div>
      <div>
        3. <strong>System Key:</strong> If you don&apos;t have any keys
        configured, we&apos;ll use our system keys
      </div>
    </div>
  </div>
));

InfoPanel.displayName = "InfoPanel";
