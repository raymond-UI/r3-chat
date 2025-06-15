import { query } from "./_generated/server";
import { v } from "convex/values";
import { rateLimiter, getModelRateLimitName, getUserRateLimitName } from "./rateLimiting";
import { getUserType, getRateLimitKey } from "./utils";

// Time constants
const DAY = 24 * 60 * 60 * 1000;

// Helper to get rate limit config
function getRateLimitConfig(limitName: string) {
  if (limitName === "anonymousDaily") {
    return { kind: "fixed window" as const, rate: 5, period: DAY };
  }
  if (limitName === "freeUserDaily") {
    return { kind: "token bucket" as const, rate: 100, period: DAY, capacity: 120 };
  }
  if (limitName.includes("freeModels")) {
    return limitName.includes("Daily") 
      ? { kind: "token bucket" as const, rate: 50, period: DAY, capacity: 60 }
      : { kind: "fixed window" as const, rate: 500, period: 30 * DAY };
  }
  if (limitName.includes("lowCostModels")) {
    return limitName.includes("Daily")
      ? { kind: "token bucket" as const, rate: 25, period: DAY, capacity: 35 }
      : { kind: "fixed window" as const, rate: 300, period: 30 * DAY };
  }
  if (limitName.includes("mediumCostModels")) {
    return limitName.includes("Daily")
      ? { kind: "token bucket" as const, rate: 15, period: DAY, capacity: 20 }
      : { kind: "fixed window" as const, rate: 150, period: 30 * DAY };
  }
  if (limitName.includes("highCostModels")) {
    return limitName.includes("Daily")
      ? { kind: "token bucket" as const, rate: 10, period: DAY, capacity: 12 }
      : { kind: "fixed window" as const, rate: 100, period: 30 * DAY };
  }
  // Default to medium cost
  return limitName.includes("Daily")
    ? { kind: "token bucket" as const, rate: 15, period: DAY, capacity: 20 }
    : { kind: "fixed window" as const, rate: 150, period: 30 * DAY };
}

// Check if user can send a message without actually consuming the rate limit
export const checkMessageRateLimit = query({
  args: {
    aiModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userType = getUserType(identity);
    const rateLimitKey = getRateLimitKey(identity);
    
    // Check user-level rate limit
    const userLimitName = getUserRateLimitName(userType);
    const userConfig = getRateLimitConfig(userLimitName);
    const userStatus = await rateLimiter.check(ctx, userLimitName, {
      key: rateLimitKey,
      config: userConfig,
    });
    
    let modelStatus = null;
    let dailyModelStatus = null;
    let monthlyModelStatus = null;
    
    // Check model-specific rate limits if AI model is specified
    if (args.aiModel) {
      const modelLimitNameDaily = getModelRateLimitName(args.aiModel, "daily");
      const modelLimitNameMonthly = getModelRateLimitName(args.aiModel, "monthly");
      
      const dailyConfig = getRateLimitConfig(modelLimitNameDaily);
      const monthlyConfig = getRateLimitConfig(modelLimitNameMonthly);
      
      dailyModelStatus = await rateLimiter.check(ctx, modelLimitNameDaily, {
        key: rateLimitKey,
        config: dailyConfig,
      });
      
      monthlyModelStatus = await rateLimiter.check(ctx, modelLimitNameMonthly, {
        key: rateLimitKey,
        config: monthlyConfig,
      });
      
      modelStatus = {
        daily: dailyModelStatus,
        monthly: monthlyModelStatus,
      };
    }
    
    return {
      canSendMessage: userStatus.ok && (modelStatus ? dailyModelStatus?.ok && monthlyModelStatus?.ok : true),
      limits: {
        user: {
          type: userType,
          ok: userStatus.ok,
          retryAfter: userStatus.retryAfter,
        },
        model: modelStatus ? {
          daily: {
            ok: dailyModelStatus?.ok,
            retryAfter: dailyModelStatus?.retryAfter,
          },
          monthly: {
            ok: monthlyModelStatus?.ok,
            retryAfter: monthlyModelStatus?.retryAfter,
          },
        } : null,
      },
    };
  },
});

// Get current rate limit status for UI display
export const getRateLimitStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userType = getUserType(identity);
    const rateLimitKey = getRateLimitKey(identity);
    
    const userLimitName = getUserRateLimitName(userType);
    const userConfig = getRateLimitConfig(userLimitName);
    const userStatus = await rateLimiter.check(ctx, userLimitName, {
      key: rateLimitKey,
      config: userConfig,
    });
    
    // Calculate remaining messages based on the config and status
    let remainingMessages = null;
    if (userConfig.kind === "fixed window") {
      // For fixed window, calculate remaining from rate limit
      remainingMessages = userStatus.ok ? userConfig.rate : 0;
    } else if (userConfig.kind === "token bucket") {
      // For token bucket, we need to estimate remaining tokens
      // Since we can't get exact count, we'll estimate based on capacity
      remainingMessages = userStatus.ok ? userConfig.capacity : 0;
    }
    
    return {
      userType,
      userLimit: {
        ok: userStatus.ok,
        retryAfter: userStatus.retryAfter,
        remaining: remainingMessages,
        total: userConfig.kind === "fixed window" ? userConfig.rate : userConfig.capacity,
      },
      isAnonymous: !identity,
    };
  },
});

// Get remaining messages count for anonymous and free users
export const getRemainingMessages = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userType = getUserType(identity);
    const rateLimitKey = getRateLimitKey(identity);
    
    const userLimitName = getUserRateLimitName(userType);
    const userConfig = getRateLimitConfig(userLimitName);
    
    // Get current rate limiter status
    const status = await rateLimiter.check(ctx, userLimitName, {
      key: rateLimitKey,
      config: userConfig,
    });
    
    const total = userConfig.kind === "fixed window" ? userConfig.rate : userConfig.capacity;
    
    if (!status.ok) {
      return {
        remaining: 0,
        total,
        isExhausted: true,
        userType,
        retryAfter: status.retryAfter,
      };
    }
    
    // Simplified approach: return estimates based on user type
    let remaining = total;
    
    if (userType === "anonymous") {
      // For anonymous users, show a decreasing count throughout the day
      // This simulates usage - could be enhanced with actual tracking
      const now = new Date();
      const hourOfDay = now.getHours();
      const usageEstimate = Math.floor((hourOfDay / 24) * total * 0.6); // 60% usage estimate
      remaining = Math.max(0, total - usageEstimate);
    } else if (userType === "free") {
      // For free users, show more conservative availability
      const now = new Date();
      const hourOfDay = now.getHours();
      const usageEstimate = Math.floor((hourOfDay / 24) * total * 0.2); // 20% usage estimate
      remaining = Math.max(10, total - usageEstimate);
    }
    
    return {
      remaining,
      total,
      isExhausted: false,
      userType,
      retryAfter: null,
    };
  },
}); 