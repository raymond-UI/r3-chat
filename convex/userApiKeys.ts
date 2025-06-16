import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { checkSecurityPolicy } from "./lib/security";
import { checkApiKeyAccessLimit, checkApiKeyUpdateLimit } from "./rateLimitingApiKeys";

// Get user API keys (returns existence status only - masking done client-side)
export const getUserApiKeys = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== userId) {
      throw new Error("Unauthorized");
    }

    // Rate limit API key access to prevent information gathering attacks
    const rateLimitResult = await checkApiKeyAccessLimit(ctx, userId);
    if (!rateLimitResult.ok) {
      throw new Error(`Rate limit exceeded. Too many API key access attempts. Try again in ${Math.ceil(rateLimitResult.retryAfter / 1000 / 60)} minutes.`);
    }

    const apiKeys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!apiKeys) {
      return null;
    }

    // Return only existence status - actual keys are handled via actions
    return {
      hasOpenaiKey: !!apiKeys.openaiKey,
      hasAnthropicKey: !!apiKeys.anthropicKey,
      hasGoogleKey: !!apiKeys.googleKey,
      hasOpenrouterKey: !!apiKeys.openrouterKey,
      keyStatus: apiKeys.keyStatus,
      updatedAt: apiKeys.updatedAt,
    };
  },
});

// Get encrypted API keys for internal use (decryption handled via actions)
export const getEncryptedApiKeys = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== userId) {
      throw new Error("Unauthorized");
    }

    const apiKeys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!apiKeys) {
      return null;
    }

    // Return encrypted keys for use with decryption actions
    return {
      openaiKey: apiKeys.openaiKey || null,
      anthropicKey: apiKeys.anthropicKey || null,
      googleKey: apiKeys.googleKey || null,
      openrouterKey: apiKeys.openrouterKey || null,
      keyStatus: apiKeys.keyStatus,
      updatedAt: apiKeys.updatedAt,
    };
  },
});

// Get user AI preferences
export const getUserAiPreferences = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const preferences = await ctx.db
      .query("userAiPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!preferences) {
      // Return default preferences for simplified schema
      return {
        defaultProviders: {
          openai: false,
          anthropic: false,
          google: false,
          openrouter: false,
        },
        defaultModels: {
          chat: "openai/gpt-4o",
          vision: "openai/gpt-4o",
          coding: "openai/gpt-4o",
        },
      };
    }

    return {
      defaultProviders: preferences.defaultProviders || {
        openai: false,
        anthropic: false,
        google: false,
        openrouter: false,
      },
      defaultModels: preferences.defaultModels || {
        chat: "openai/gpt-4o",
        vision: "openai/gpt-4o", 
        coding: "openai/gpt-4o",
      },
      updatedAt: preferences.updatedAt,
    };
  },
});

// Internal mutation to store encrypted API keys (called by actions only)
export const updateApiKeysEncrypted = internalMutation({
  args: {
    userId: v.string(),
    openaiKey: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    googleKey: v.optional(v.string()),
    openrouterKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit API key updates to prevent abuse
    const rateLimitResult = await checkApiKeyUpdateLimit(ctx, args.userId);
    if (!rateLimitResult.ok) {
      throw new Error(`Rate limit exceeded. Too many API key updates. Try again in ${Math.ceil(rateLimitResult.retryAfter / 1000 / 60)} minutes.`);
    }

    // Check security policy
    const policyCheck = await checkSecurityPolicy(ctx, args.userId, "key_update");
    if (!policyCheck.allowed) {
      throw new Error(policyCheck.reason || "Action not allowed by security policy");
    }

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    
    // Store encrypted API keys (already encrypted by action)
    const keyData = {
      userId: args.userId,
      openaiKey: args.openaiKey || existing?.openaiKey,
      anthropicKey: args.anthropicKey || existing?.anthropicKey,
      googleKey: args.googleKey || existing?.googleKey,
      openrouterKey: args.openrouterKey || existing?.openrouterKey,
      updatedAt: now,
    };

    let result;
    if (existing) {
      await ctx.db.patch(existing._id, keyData);
      result = existing._id;
    } else {
      result = await ctx.db.insert("userApiKeys", {
        ...keyData,
        createdAt: now,
      });
    }

    // TODO: Add audit logging once scheduler reference is properly configured

    return result;
  },
});

// Internal query to get encrypted API keys (called by actions only)
export const getApiKeysEncrypted = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const keys = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return keys;
  },
});

// Public mutation for backward compatibility (deprecated - use actions instead)
export const updateApiKeys = mutation({
  args: {
    userId: v.string(),
    openaiKey: v.optional(v.string()),
    anthropicKey: v.optional(v.string()),
    googleKey: v.optional(v.string()),
    openrouterKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Ensure user can only update their own keys
    if (identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    // This is deprecated - redirect to use the secure action instead
    throw new Error("Please use the secure API key update action instead of this mutation");
  },
});

// Update user AI preferences
export const updateAiPreferences = mutation({
  args: {
    userId: v.string(),
    keyConfiguration: v.optional(v.union(
      v.literal("default"),
      v.literal("own-openrouter"), 
      v.literal("mixed"),
      v.literal("direct-only")
    )),
    defaultProviders: v.optional(v.object({
      openai: v.boolean(),
      anthropic: v.boolean(),
      google: v.boolean(),
      openrouter: v.boolean(),
    })),
    defaultModels: v.optional(v.object({
      chat: v.string(),
      vision: v.string(),
      coding: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Ensure user can only update their own preferences
    if (identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("userAiPreferences")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();
    const preferenceData = {
      userId: args.userId,
      keyConfiguration: args.keyConfiguration,
      defaultProviders: args.defaultProviders,
      defaultModels: args.defaultModels,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, preferenceData);
      return existing._id;
    } else {
      return await ctx.db.insert("userAiPreferences", {
        ...preferenceData,
        createdAt: now,
      });
    }
  },
});

// Validate and update API key status
export const updateKeyStatus = mutation({
  args: {
    userId: v.string(),
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter")
    ),
    isValid: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Ensure user can only update their own key status
    if (identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!existing) {
      throw new Error("No API keys found for user");
    }

    const now = Date.now();
    const keyStatus = existing.keyStatus || {};
    
    keyStatus[args.provider] = {
      isValid: args.isValid,
      lastChecked: now,
      error: args.error,
    };

    await ctx.db.patch(existing._id, {
      keyStatus,
      updatedAt: now,
    });

    return keyStatus;
  },
});

// Delete user API keys
export const deleteApiKeys = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Ensure user can only delete their own keys
    if (identity.subject !== userId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    return true;
  },
});

// Delete specific API key
export const deleteSpecificApiKey = mutation({
  args: {
    userId: v.string(),
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    // Ensure user can only delete their own keys
    if (identity.subject !== args.userId) {
      throw new Error("Unauthorized");
    }

    const existing = await ctx.db
      .query("userApiKeys")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      const updateData: Record<string, unknown> = { updatedAt: Date.now() };
      updateData[`${args.provider}Key`] = undefined;
      
      // Remove key status for this provider
      if (existing.keyStatus) {
        const keyStatus = { ...existing.keyStatus };
        delete keyStatus[args.provider];
        updateData.keyStatus = keyStatus;
      }

      await ctx.db.patch(existing._id, updateData);
    }

    return true;
  },
});

// Get current user's configuration (for convenience)
export const getMyConfiguration = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userId = identity.subject;

    const [apiKeys, preferences] = await Promise.all([
      ctx.db
        .query("userApiKeys")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
      ctx.db
        .query("userAiPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
    ]);

    return {
      apiKeys: apiKeys ? {
        openaiKey: apiKeys.openaiKey,
        anthropicKey: apiKeys.anthropicKey,
        googleKey: apiKeys.googleKey,
        openrouterKey: apiKeys.openrouterKey,
        keyStatus: apiKeys.keyStatus,
        updatedAt: apiKeys.updatedAt,
      } : null,
      preferences: preferences ? {
        defaultProviders: preferences.defaultProviders || {
          openai: false,
          anthropic: false,
          google: false,
          openrouter: false,
        },
        defaultModels: preferences.defaultModels || {
          chat: "openai/gpt-4o",
          vision: "openai/gpt-4o",
          coding: "openai/gpt-4o",
        },
        updatedAt: preferences.updatedAt,
      } : {
        defaultProviders: {
          openai: false,
          anthropic: false,
          google: false,
          openrouter: false,
        },
        defaultModels: {
          chat: "openai/gpt-4o",
          vision: "openai/gpt-4o",
          coding: "openai/gpt-4o",
        },
      },
    };
  },
});

// Get user configuration by userId (for API routes)
export const getUserConfiguration = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const [apiKeys, preferences] = await Promise.all([
      ctx.db
        .query("userApiKeys")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
      ctx.db
        .query("userAiPreferences")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first(),
    ]);

    return {
      apiKeys: apiKeys ? {
        openaiKey: apiKeys.openaiKey,
        anthropicKey: apiKeys.anthropicKey,
        googleKey: apiKeys.googleKey,
        openrouterKey: apiKeys.openrouterKey,
        keyStatus: apiKeys.keyStatus,
      } : null,
      preferences: preferences ? {
        defaultProviders: preferences.defaultProviders || {
          openai: false,
          anthropic: false,
          google: false,
          openrouter: false,
        },
        defaultModels: preferences.defaultModels || {
          chat: "openai/gpt-4o", 
          vision: "openai/gpt-4o",
          coding: "openai/gpt-4o",
        },
      } : {
        defaultProviders: {
          openai: false,
          anthropic: false,
          google: false,
          openrouter: false,
        },
        defaultModels: {
          chat: "openai/gpt-4o",
          vision: "openai/gpt-4o", 
          coding: "openai/gpt-4o",
        },
      },
    };
  },
}); 