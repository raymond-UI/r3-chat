export type ProviderId = "openai" | "anthropic" | "google" | "openrouter";

export interface Provider {
  readonly id: ProviderId;
  readonly name: string;
  readonly description: string;
  readonly website: string;
  readonly models: readonly string[];
  readonly benefits: readonly string[];
}

export interface ApiKeyState {
  readonly hasOpenaiKey?: boolean;
  readonly hasAnthropicKey?: boolean;
  readonly hasGoogleKey?: boolean;
  readonly hasOpenrouterKey?: boolean;
}

export interface DefaultProviders {
  readonly openai: boolean;
  readonly anthropic: boolean;
  readonly google: boolean;
  readonly openrouter: boolean;
}

export interface UserPreferences {
  readonly defaultProviders?: DefaultProviders;
}

export interface ApiKeyDialogProps {
  readonly provider: Provider;
  readonly hasKey: boolean;
  readonly isDefault: boolean;
  readonly maskedKey?: string | null;
  readonly onSave: (key: string, isDefault: boolean) => Promise<void>;
  readonly onDelete: () => Promise<void>;
}
