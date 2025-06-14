// new file
import { AI_MODELS, ModelKey } from "@/types/ai";

export type UserType = "anonymous" | "free" | "paid";
export type CostTier = "free" | "low" | "medium" | "high" | "premium";

export interface MessageLimits {
  anonymous: number;
  free: number;
  paid: number;
}

export const DEFAULT_MESSAGE_LIMITS: MessageLimits = {
  anonymous: 5, // 5
  free: 100,
  paid: -1, // -1 means unlimited
};

export interface ModelLimits {
  anonymous: number;
  free: number;
  paid: number;
}

export interface ModelCostInfo {
  tier: CostTier;
  estimatedCostPer1kTokens: number; // in USD
  dailyLimits: ModelLimits;
  monthlyLimits: ModelLimits;
}

// Cost tiers based on API pricing research
export const COST_TIERS: Record<CostTier, ModelCostInfo> = {
  free: {
    tier: "free",
    estimatedCostPer1kTokens: 0,
    dailyLimits: { anonymous: 10, free: 50, paid: 200 },
    monthlyLimits: { anonymous: 50, free: 500, paid: 2000 },
  },
  low: {
    tier: "low",
    estimatedCostPer1kTokens: 0.0005, // $0.5 per 1M tokens
    dailyLimits: { anonymous: 5, free: 25, paid: 150 },
    monthlyLimits: { anonymous: 25, free: 300, paid: 1500 },
  },
  medium: {
    tier: "medium",
    estimatedCostPer1kTokens: 0.003, // $3 per 1M tokens
    dailyLimits: { anonymous: 3, free: 15, paid: 100 },
    monthlyLimits: { anonymous: 15, free: 150, paid: 1000 },
  },
  high: {
    tier: "high",
    estimatedCostPer1kTokens: 0.015, // $15 per 1M tokens
    dailyLimits: { anonymous: 2, free: 10, paid: 75 },
    monthlyLimits: { anonymous: 10, free: 100, paid: 750 },
  },
  premium: {
    tier: "premium",
    estimatedCostPer1kTokens: 0.075, // $75 per 1M tokens
    dailyLimits: { anonymous: 1, free: 5, paid: 50 },
    monthlyLimits: { anonymous: 5, free: 50, paid: 500 },
  },
};

// Model-specific cost tier mapping based on research
export const MODEL_COST_MAPPING: Record<ModelKey, CostTier> = {
  // Free models
  "google/gemini-2.0-flash-exp:free": "free",
  "meta-llama/llama-3.3-8b-instruct:free": "free",

  // Low cost models (~$0.5-2 per 1M tokens)
  "openai/gpt-4o-mini": "low",
  "openai/gpt-3.5-turbo": "low",

  // Medium cost models (~$3-10 per 1M tokens)
  "openai/gpt-4o-mini-search-preview": "medium",
  "anthropic/claude-3.7-sonnet": "medium",
  "anthropic/claude-3.5-sonnet": "medium",
  "anthropic/claude-3-haiku": "medium",
  "gemini-2.5-pro": "medium",
  "google/gemini-2.0-flash-001": "medium",

  // High cost models (~$15-30 per 1M tokens)
  "openai/gpt-4.1": "high",
  "anthropic/claude-sonnet-4": "high",

  // Premium models would go here (>$50 per 1M tokens)
  // Currently no models in this tier from the provided list
};

export class ModelLimitManager {
  private static readonly MODEL_USAGE_KEY = "model_usage_tracking";
  private static readonly DAILY_RESET_KEY = "daily_reset_timestamp";
  private static readonly MONTHLY_RESET_KEY = "monthly_reset_timestamp";

  // Anonymous user tracking keys
  private static readonly ANONYMOUS_MESSAGE_COUNT_KEY =
    "anonymous_message_count";
  private static readonly ANONYMOUS_CONVERSATIONS_KEY =
    "anonymous_conversations";

  /**
   * Get cost tier for a specific model
   */
  static getModelCostTier(modelKey: ModelKey): CostTier {
    return MODEL_COST_MAPPING[modelKey] || "medium";
  }

  /**
   * Get cost information for a model
   */
  static getModelCostInfo(modelKey: ModelKey): ModelCostInfo {
    const tier = this.getModelCostTier(modelKey);
    return COST_TIERS[tier];
  }

  /**
   * Get daily message limit for a model and user type
   */
  static getDailyLimit(
    modelKey: ModelKey,
    userType: "anonymous" | "free" | "paid"
  ): number {
    const costInfo = this.getModelCostInfo(modelKey);
    return costInfo.dailyLimits[userType];
  }

  /**
   * Get monthly message limit for a model and user type
   */
  static getMonthlyLimit(
    modelKey: ModelKey,
    userType: "anonymous" | "free" | "paid"
  ): number {
    const costInfo = this.getModelCostInfo(modelKey);
    return costInfo.monthlyLimits[userType];
  }

  /**
   * Track model usage
   */
  private static getModelUsage(): Record<
    string,
    { daily: number; monthly: number; lastDaily: number; lastMonthly: number }
  > {
    if (typeof window === "undefined") return {};
    const usage = localStorage.getItem(this.MODEL_USAGE_KEY);
    return usage ? JSON.parse(usage) : {};
  }

  /**
   * Save model usage
   */
  private static saveModelUsage(
    usage: Record<
      string,
      { daily: number; monthly: number; lastDaily: number; lastMonthly: number }
    >
  ): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.MODEL_USAGE_KEY, JSON.stringify(usage));
  }

  /**
   * Check if daily/monthly limits need to be reset
   */
  private static checkAndResetLimits(): void {
    if (typeof window === "undefined") return;

    const now = Date.now();
    const lastDailyReset = parseInt(
      localStorage.getItem(this.DAILY_RESET_KEY) || "0",
      10
    );
    const lastMonthlyReset = parseInt(
      localStorage.getItem(this.MONTHLY_RESET_KEY) || "0",
      10
    );

    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const usage = this.getModelUsage();
    let resetNeeded = false;

    // Reset daily limits
    if (lastDailyReset < oneDayAgo) {
      Object.keys(usage).forEach((key) => {
        usage[key].daily = 0;
      });
      localStorage.setItem(this.DAILY_RESET_KEY, now.toString());
      resetNeeded = true;
    }

    // Reset monthly limits
    if (lastMonthlyReset < oneMonthAgo) {
      Object.keys(usage).forEach((key) => {
        usage[key].monthly = 0;
      });
      localStorage.setItem(this.MONTHLY_RESET_KEY, now.toString());
      resetNeeded = true;
    }

    if (resetNeeded) {
      this.saveModelUsage(usage);
    }
  }

  /**
   * Get current usage for a model
   */
  static getModelUsageCount(modelKey: ModelKey): {
    daily: number;
    monthly: number;
  } {
    this.checkAndResetLimits();
    const usage = this.getModelUsage();
    const modelUsage = usage[modelKey] || {
      daily: 0,
      monthly: 0,
      lastDaily: 0,
      lastMonthly: 0,
    };
    return { daily: modelUsage.daily, monthly: modelUsage.monthly };
  }

  /**
   * Increment usage for a model
   */
  static incrementModelUsage(modelKey: ModelKey): void {
    this.checkAndResetLimits();
    const usage = this.getModelUsage();

    if (!usage[modelKey]) {
      usage[modelKey] = { daily: 0, monthly: 0, lastDaily: 0, lastMonthly: 0 };
    }

    usage[modelKey].daily += 1;
    usage[modelKey].monthly += 1;

    this.saveModelUsage(usage);
  }

  /**
   * Check if user can send message with specific model
   */
  static canUseModel(
    modelKey: ModelKey,
    userType: "anonymous" | "free" | "paid"
  ): { canUse: boolean; reason?: string } {
    const dailyLimit = this.getDailyLimit(modelKey, userType);
    const monthlyLimit = this.getMonthlyLimit(modelKey, userType);
    const usage = this.getModelUsageCount(modelKey);

    if (usage.daily >= dailyLimit) {
      return { canUse: false, reason: "daily_limit_exceeded" };
    }

    if (usage.monthly >= monthlyLimit) {
      return { canUse: false, reason: "monthly_limit_exceeded" };
    }

    return { canUse: true };
  }

  /**
   * Get remaining messages for a model
   */
  static getRemainingMessages(
    modelKey: ModelKey,
    userType: "anonymous" | "free" | "paid"
  ): { daily: number; monthly: number } {
    const dailyLimit = this.getDailyLimit(modelKey, userType);
    const monthlyLimit = this.getMonthlyLimit(modelKey, userType);
    const usage = this.getModelUsageCount(modelKey);

    return {
      daily: Math.max(0, dailyLimit - usage.daily),
      monthly: Math.max(0, monthlyLimit - usage.monthly),
    };
  }

  /**
   * Get models available for user type, sorted by cost efficiency
   */
  static getAvailableModels(userType: "anonymous" | "free" | "paid"): Array<{
    modelKey: ModelKey;
    model: (typeof AI_MODELS)[ModelKey];
    costTier: CostTier;
    remaining: { daily: number; monthly: number };
    canUse: boolean;
  }> {
    const models = Object.entries(AI_MODELS) as [
      ModelKey,
      (typeof AI_MODELS)[ModelKey],
    ][];

    return models
      .map(([modelKey, model]) => {
        const costTier = this.getModelCostTier(modelKey);
        const remaining = this.getRemainingMessages(modelKey, userType);
        const { canUse } = this.canUseModel(modelKey, userType);

        return {
          modelKey,
          model,
          costTier,
          remaining,
          canUse,
        };
      })
      .sort((a, b) => {
        // Sort by: 1) availability, 2) cost tier (free first), 3) remaining messages
        if (a.canUse && !b.canUse) return -1;
        if (!a.canUse && b.canUse) return 1;

        const tierOrder = ["free", "low", "medium", "high", "premium"];
        const aTierIndex = tierOrder.indexOf(a.costTier);
        const bTierIndex = tierOrder.indexOf(b.costTier);

        if (aTierIndex !== bTierIndex) return aTierIndex - bTierIndex;

        return b.remaining.daily - a.remaining.daily;
      });
  }

  /**
   * Clear all model usage data
   */
  static clearModelUsage(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.MODEL_USAGE_KEY);
    localStorage.removeItem(this.DAILY_RESET_KEY);
    localStorage.removeItem(this.MONTHLY_RESET_KEY);
  }

  /**
   * Get cost estimate for a conversation
   */
  static estimateConversationCost(
    modelKey: ModelKey,
    estimatedTokens: number
  ): number {
    const costInfo = this.getModelCostInfo(modelKey);
    return (estimatedTokens / 1000) * costInfo.estimatedCostPer1kTokens;
  }

  // ===== Anonymous User Message Tracking Methods =====

  /**
   * Get message limit for user type
   */
  static getMessageLimit(userType: UserType): number {
    return DEFAULT_MESSAGE_LIMITS[userType];
  }

  /**
   * Get current anonymous message count
   */
  static getAnonymousMessageCount(): number {
    if (typeof window === "undefined") return 0;
    const count = localStorage.getItem(this.ANONYMOUS_MESSAGE_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Increment anonymous message count
   */
  static incrementAnonymousMessageCount(): number {
    if (typeof window === "undefined") return 0;
    const currentCount = this.getAnonymousMessageCount();
    const newCount = currentCount + 1;
    localStorage.setItem(this.ANONYMOUS_MESSAGE_COUNT_KEY, newCount.toString());
    return newCount;
  }

  /**
   * Check if user can send a message
   */
  static canSendMessage(userType: UserType): boolean {
    if (userType === "paid") return true; // Unlimited for paid users

    const limit = this.getMessageLimit(userType);
    if (limit === -1) return true; // Unlimited

    if (userType === "anonymous") {
      const currentCount = this.getAnonymousMessageCount();
      return currentCount < limit;
    }

    // For free users, this would need to be tracked differently
    // For now, assume they can send messages (implement server-side tracking)
    return true;
  }

  /**
   * Get anonymous conversations list
   */
  static getAnonymousConversations(): string[] {
    if (typeof window === "undefined") return [];
    const conversations = localStorage.getItem(
      this.ANONYMOUS_CONVERSATIONS_KEY
    );
    return conversations ? JSON.parse(conversations) : [];
  }

  /**
   * Add anonymous conversation ID
   */
  static addAnonymousConversation(conversationId: string): void {
    if (typeof window === "undefined") return;
    const conversations = this.getAnonymousConversations();
    if (!conversations.includes(conversationId)) {
      conversations.push(conversationId);
      localStorage.setItem(
        this.ANONYMOUS_CONVERSATIONS_KEY,
        JSON.stringify(conversations)
      );
    }
  }

  /**
   * Clear all anonymous data
   */
  static clearAnonymousData(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.ANONYMOUS_MESSAGE_COUNT_KEY);
    localStorage.removeItem(this.ANONYMOUS_CONVERSATIONS_KEY);
  }
}

{
  /*
## Summary: Message Limits for Free Account Users

### Free Models (like "google/gemini-2.0-flash-exp:free")
- **Daily limit: 50 messages**
- **Monthly limit: 500 messages**

### Other Model Tiers for Free Users
- **Low cost models:** 25 daily, 300 monthly
- **Medium cost models:** 15 daily, 150 monthly  
- **High cost models:** 10 daily, 100 monthly
- **Premium models:** 5 daily, 50 monthly

### Anonymous vs Free Users
- **Anonymous:** 10 daily / 50 monthly for free models
- **Free account:** 50 daily / 500 monthly for free models





*/
}
