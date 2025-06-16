import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Log security-related actions for audit trail
export const logAuditEvent = internalMutation({
  args: {
    userId: v.string(),
    provider: v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter")
    ),
    action: v.union(
      v.literal("key_created"),
      v.literal("key_updated"),
      v.literal("key_deleted"),
      v.literal("key_used"),
      v.literal("key_validation_failed"),
      v.literal("key_validation_succeeded")
    ),
    metadata: v.optional(v.object({
      model: v.optional(v.string()),
      tokenCount: v.optional(v.number()),
      cost: v.optional(v.number()),
      error: v.optional(v.string()),
      ipAddress: v.optional(v.string()),
      userAgent: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("apiKeyAuditLogs", {
      userId: args.userId,
      provider: args.provider,
      action: args.action,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

// Helper function to validate API key format
export function isValidApiKeyFormat(provider: string, apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== "string") return false;
  
  const trimmedKey = apiKey.trim();
  
  switch (provider) {
    case "openai":
      return /^sk-[a-zA-Z0-9]{48,}$/.test(trimmedKey);
    case "anthropic":
      return /^sk-ant-[a-zA-Z0-9_\-]{95,}$/.test(trimmedKey);
    case "google":
      return /^[a-zA-Z0-9_\-]{35,45}$/.test(trimmedKey);
    case "openrouter":
      return /^sk-or-[a-zA-Z0-9_\-]{57,}$/.test(trimmedKey);
    default:
      return false;
  }
}

// Simple hash function for API key tracking
export function simpleHashApiKey(apiKey: string): string {
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// Get user security settings with defaults
export const getUserSecuritySettings = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== userId) {
      throw new Error("Unauthorized");
    }

    const settings = await ctx.db
      .query("userSecuritySettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!settings) {
      // Return default security settings
      return {
        enableAuditLogging: true,
        keyRotationEnabled: false,
        keyRotationIntervalDays: 90,
        allowKeySharing: false,
        requireKeyValidation: true,
        maxFailedValidations: 3,
        enableUsageTracking: true,
      };
    }

    return settings.settings;
  },
});

// Calculate security score based on user configuration
export function calculateSecurityScore(hasApiKeys: boolean, encryptionEnabled: boolean): number {
  let score = 0;
  
  // Base score for having the system
  score += 20;
  
  // Encryption enabled
  if (encryptionEnabled) score += 30;
  
  // API keys configured (shows user engagement with security)
  if (hasApiKeys) score += 25;
  
  // Additional security measures (placeholder for future features)
  score += 25; // Audit logging, rate limiting, etc.
  
  return Math.min(100, score);
}

// Check if user is allowed to perform action based on security settings (simplified)
export async function checkSecurityPolicy(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _ctx: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId: string, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _action: "key_update" | "key_validation" | "key_usage"
): Promise<{ allowed: boolean; reason?: string }> {
  // Simplified security policy - always allow for now
  // TODO: Implement proper security policy checks
  return { allowed: true };
} 