import { RateLimiter, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";

// Time constants
const DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Create the rate limiter with configurations matching MessageLimitManager
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // === Anonymous User Limits ===
  // Global daily limit for anonymous users (5 messages per day)
  anonymousDaily: {
    kind: "fixed window",
    rate: 10,
    period: DAY,
  },

  // === Free User Limits ===
  // Free users get more generous limits
  freeUserDaily: {
    kind: "token bucket",
    rate: 100,
    period: DAY,
    capacity: 120, // Allow some burst capacity
  },

  // === Model-Specific Limits ===
  // Free models (like Gemini Flash Free)
  freeModelsDaily: {
    kind: "token bucket",
    rate: 50,
    period: DAY,
    capacity: 60,
  },
  freeModelsMonthly: {
    kind: "fixed window",
    rate: 500,
    period: 30 * DAY,
  },

  // Low cost models (~$0.5-2 per 1M tokens)
  lowCostModelsDaily: {
    kind: "token bucket",
    rate: 25,
    period: DAY,
    capacity: 35,
  },
  lowCostModelsMonthly: {
    kind: "fixed window",
    rate: 300,
    period: 30 * DAY,
  },

  // Medium cost models (~$3-10 per 1M tokens)
  mediumCostModelsDaily: {
    kind: "token bucket",
    rate: 15,
    period: DAY,
    capacity: 20,
  },
  mediumCostModelsMonthly: {
    kind: "fixed window",
    rate: 150,
    period: 30 * DAY,
  },

  // High cost models (~$15-30 per 1M tokens)
  highCostModelsDaily: {
    kind: "token bucket",
    rate: 10,
    period: DAY,
    capacity: 12,
  },
  highCostModelsMonthly: {
    kind: "fixed window",
    rate: 100,
    period: 30 * DAY,
  },

  // Premium models (>$50 per 1M tokens)
  premiumModelsDaily: {
    kind: "token bucket",
    rate: 5,
    period: DAY,
    capacity: 7,
  },
  premiumModelsMonthly: {
    kind: "fixed window",
    rate: 50,
    period: 30 * DAY,
  },

  // === Special Limits ===
  // Failed logins per IP/user
  failedLogins: {
    kind: "token bucket",
    rate: 5,
    period: HOUR,
  },

  // Account creation (global limit)
  accountCreation: {
    kind: "token bucket",
    rate: 100,
    period: HOUR,
  },

  // Conversation creation per user
  conversationCreation: {
    kind: "token bucket",
    rate: 50,
    period: HOUR,
    capacity: 60,
  },
});

// Model cost tier mapping (from MessageLimitManager)
export const MODEL_COST_MAPPING = {
  // Free models
  "google/gemini-2.0-flash-exp:free": "free",
  "meta-llama/llama-3.3-8b-instruct:free": "free",

  // Low cost models
  "openai/gpt-4o-mini": "low",
  "openai/gpt-3.5-turbo": "low",

  // Medium cost models
  "openai/gpt-4o-mini-search-preview": "medium",
  "anthropic/claude-3.7-sonnet": "medium",
  "anthropic/claude-3.5-sonnet": "medium",
  "anthropic/claude-3-haiku": "medium",
  "gemini-2.5-pro": "medium",
  "google/gemini-2.0-flash-001": "medium",

  // High cost models
  "openai/gpt-4.1": "high",
  "anthropic/claude-sonnet-4": "high",
} as const;

export type CostTier = "free" | "low" | "medium" | "high" | "premium";

// Helper function to get the appropriate rate limit name for a model
export function getModelRateLimitName(
  modelKey: string,
  period: "daily" | "monthly"
): string {
  const tier = MODEL_COST_MAPPING[modelKey as keyof typeof MODEL_COST_MAPPING] || "medium";
  
  switch (tier) {
    case "free":
      return period === "daily" ? "freeModelsDaily" : "freeModelsMonthly";
    case "low":
      return period === "daily" ? "lowCostModelsDaily" : "lowCostModelsMonthly";
    case "medium":
      return period === "daily" ? "mediumCostModelsDaily" : "mediumCostModelsMonthly";
    case "high":
      return period === "daily" ? "highCostModelsDaily" : "highCostModelsMonthly";
    default:
      return period === "daily" ? "mediumCostModelsDaily" : "mediumCostModelsMonthly";
  }
}

// Helper function to get user type rate limit
export function getUserRateLimitName(userType: "anonymous" | "free" | "paid"): string {
  switch (userType) {
    case "anonymous":
      return "anonymousDaily";
    case "free":
      return "freeUserDaily";
    case "paid":
      // Paid users don't have limits, but we'll use a very generous limit
      return "freeUserDaily"; // Could create a separate "paidUserDaily" with higher limits
    default:
      return "anonymousDaily";
  }
} 