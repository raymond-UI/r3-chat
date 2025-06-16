"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { 
  encryptApiKey, 
  decryptApiKey, 
  maskApiKey, 
  validateApiKeyFormat 
} from "../lib/encryption";

// Types for return values
type ApiKeyUpdateResult = Id<"userApiKeys">;

type DecryptedKeysResult = {
  userId: string;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
  openrouterKey?: string;
  keyStatus?: Record<string, unknown>;
  updatedAt?: number;
  createdAt?: number;
  decryptedKeys: Record<string, string>;
} | null;

type MaskedKeysResult = {
  userId: string;
  maskedKeys: Record<string, string>;
  hasKeys: {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    openrouter: boolean;
  };
  updatedAt?: number;
  createdAt?: number;
} | null;

// Action to securely update API keys with encryption
export const updateApiKeysSecure = action({
  args: {
    userId: v.string(),
    openaiKey: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    googleKey: v.optional(v.string()),
    openrouterKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ApiKeyUpdateResult> => {
    // Encrypt each provided API key
    const encryptedKeys: Record<string, string> = {};
    
    if (args.openaiKey) {
      encryptedKeys.openaiKey = await encryptApiKey(args.openaiKey);
    }
    
    if (args.anthropicKey) {
      encryptedKeys.anthropicKey = await encryptApiKey(args.anthropicKey);
    }
    
    if (args.googleKey) {
      encryptedKeys.googleKey = await encryptApiKey(args.googleKey);
    }
    
    if (args.openrouterKey) {
      encryptedKeys.openrouterKey = await encryptApiKey(args.openrouterKey);
    }

    // Store encrypted keys in database
    return await ctx.runMutation(internal.userApiKeys.updateApiKeysEncrypted, {
      userId: args.userId,
      ...encryptedKeys,
    });
  },
});

// Action to securely retrieve and decrypt API keys
export const getApiKeysDecrypted = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<DecryptedKeysResult> => {
    // Get encrypted keys from database
    const encryptedKeys = await ctx.runQuery(internal.userApiKeys.getApiKeysEncrypted, {
      userId
    });

    if (!encryptedKeys) {
      return null;
    }

    // Decrypt each key that exists
    const decryptedKeys: Record<string, string> = {};
    
    if (encryptedKeys.openaiKey) {
      decryptedKeys.openaiKey = await decryptApiKey(encryptedKeys.openaiKey);
    }
    
    if (encryptedKeys.anthropicKey) {
      decryptedKeys.anthropicKey = await decryptApiKey(encryptedKeys.anthropicKey);
    }
    
    if (encryptedKeys.googleKey) {
      decryptedKeys.googleKey = await decryptApiKey(encryptedKeys.googleKey);
    }
    
    if (encryptedKeys.openrouterKey) {
      decryptedKeys.openrouterKey = await decryptApiKey(encryptedKeys.openrouterKey);
    }

    return {
      ...encryptedKeys,
      decryptedKeys,
    };
  },
});

// Action to get masked API keys for display
export const getApiKeysMasked = action({
  args: { userId: v.string() },
  handler: async (ctx, { userId }): Promise<MaskedKeysResult> => {
    // Get encrypted keys from database
    const encryptedKeys = await ctx.runQuery(internal.userApiKeys.getApiKeysEncrypted, {
      userId
    });

    if (!encryptedKeys) {
      return null;
    }

    // First decrypt, then mask each key
    const maskedKeys: Record<string, string> = {};
    
    if (encryptedKeys.openaiKey) {
      const decrypted = await decryptApiKey(encryptedKeys.openaiKey);
      maskedKeys.openaiKey = maskApiKey(decrypted);
    }
    
    if (encryptedKeys.anthropicKey) {
      const decrypted = await decryptApiKey(encryptedKeys.anthropicKey);
      maskedKeys.anthropicKey = maskApiKey(decrypted);
    }
    
    if (encryptedKeys.googleKey) {
      const decrypted = await decryptApiKey(encryptedKeys.googleKey);
      maskedKeys.googleKey = maskApiKey(decrypted);
    }
    
    if (encryptedKeys.openrouterKey) {
      const decrypted = await decryptApiKey(encryptedKeys.openrouterKey);
      maskedKeys.openrouterKey = maskApiKey(decrypted);
    }

    return {
      userId: encryptedKeys.userId,
      maskedKeys,
      hasKeys: {
        openai: !!encryptedKeys.openaiKey,
        anthropic: !!encryptedKeys.anthropicKey,
        google: !!encryptedKeys.googleKey,
        openrouter: !!encryptedKeys.openrouterKey,
      },
      updatedAt: encryptedKeys.updatedAt,
      createdAt: encryptedKeys.createdAt,
    };
  },
});

// Validate API key format and provider
export const validateApiKey = action({
  args: {
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter")
    ),
    apiKey: v.string(),
  },
  handler: async (ctx, { provider, apiKey }): Promise<boolean> => {
    return validateApiKeyFormat(provider, apiKey);
  },
}); 