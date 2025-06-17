# Server-Side Rate Limiting Implementation

## Overview

Replaced the insecure localStorage-based rate limiting with a robust server-side solution using Convex's official `@convex-dev/rate-limiter` component.

## 🚨 Security Issue Fixed

**Before**: Rate limits were stored in localStorage and could be easily bypassed by:
- Opening browser dev tools
- Clearing localStorage
- Manipulating stored values

**After**: All rate limiting is enforced server-side with:
- Transactional guarantees
- Tamper-proof enforcement
- Proper user/IP-based tracking

## 🛠️ Implementation Details

### 1. Core Components

- **`convex/rateLimiting.ts`**: Rate limiter configuration and helper functions
- **`convex/rateLimitChecks.ts`**: Server queries for checking limits without consuming them
- **`convex/messages.ts`**: Updated with rate limiting enforcement
- **`convex/utils.ts`**: Utility functions for user type detection and IP extraction
- **`src/lib/rateLimitError.ts`**: Client-side error handling utilities
- **`src/components/ui/RateLimitIndicator.tsx`**: UI component for displaying limits

### 2. Rate Limit Structure

#### User-Based Limits
- **Anonymous Users**: 5 messages/day (tracked by IP)
- **Free Users**: 100 messages/day + burst capacity of 120
- **Paid Users**: Uses free tier limits (can be upgraded)

#### Model-Based Limits
Different tiers based on cost per 1M tokens:

| Cost Tier | Daily Limit | Monthly Limit | Example Models |
|-----------|-------------|---------------|----------------|
| Free | 50 (cap: 60) | 500 | `google/gemini-2.0-flash-exp:free` |
| Low | 25 (cap: 35) | 300 | `openai/gpt-4o-mini` |
| Medium | 15 (cap: 20) | 150 | `anthropic/claude-3.5-sonnet` |
| High | 10 (cap: 12) | 100 | `openai/gpt-4.1` |
| Premium | 5 (cap: 7) | 50 | High-cost models |

#### Special Limits
- **Failed Logins**: 5 attempts/hour
- **Account Creation**: 100/hour (global)
- **Conversation Creation**: 50/hour + burst of 60

### 3. Rate Limiting Algorithms

- **Token Bucket**: Used for user and model limits (allows burst traffic)
- **Fixed Window**: Used for monthly limits and special cases

### 4. Key Features

#### Transactional Safety
- Rate limit checks and message creation are atomic
- Failed mutations roll back rate limit consumption
- No double-counting or lost limits

#### Smart Error Handling
- User-friendly error messages
- Retry-after timing information
- Different messages for different limit types

#### Real-time UI Updates
- `RateLimitIndicator` component shows current status
- Proactive limit checking before message send
- Visual warnings when approaching limits

### 5. Usage Examples

#### Server-Side (Convex)
```typescript
// In a mutation
const rateLimitResult = await rateLimiter.limit(ctx, "freeUserDaily", {
  key: userId,
});

if (!rateLimitResult.ok) {
  throw new Error(`Rate limit exceeded. Retry in ${rateLimitResult.retryAfter}ms`);
}
```

#### Client-Side (React)
```typescript
// Check limits before sending
const rateLimitStatus = useQuery(api.rateLimitChecks.checkMessageRateLimit, {
  aiModel: selectedModel,
});

// Handle errors
const { handleRateLimitError } = useRateLimitHandler();
const errorInfo = handleRateLimitError(error);

// Show status in UI
<RateLimitIndicator model={selectedModel} showDetails />
```

## 🎯 Benefits

### Security
- ✅ **Tamper-proof**: Cannot be bypassed by client manipulation
- ✅ **Fair enforcement**: Same rules apply to all users
- ✅ **Accurate tracking**: Proper user/IP identification

### Performance
- ✅ **Efficient storage**: Only 2 numbers per rate limit
- ✅ **Scalable**: Built-in sharding support for high throughput
- ✅ **Fast**: Optimized for Convex's real-time system

### User Experience
- ✅ **Proactive feedback**: Check limits before sending
- ✅ **Clear messaging**: User-friendly error messages
- ✅ **Visual indicators**: Real-time status display
- ✅ **Progressive enhancement**: Anonymous → Free → Paid tiers

### Developer Experience
- ✅ **Type-safe**: Won't accidentally misspell rate limit names
- ✅ **Configurable**: Easy to adjust limits and add new tiers
- ✅ **Observable**: Built-in monitoring and status checking

## 🔄 Migration Notes

### Removed Files
- `src/utils/MessageLimitManager.ts` (replaced by server-side system)
- Any client-side limit checking logic

### Updated Components
Components that previously used `MessageLimitManager` will need to:
1. Remove client-side limit checks
2. Handle rate limit errors from Convex mutations
3. Use the new `RateLimitIndicator` component
4. Query rate limit status via `api.rateLimitChecks.*`

### Backwards Compatibility
- Existing conversations and messages are unaffected
- User accounts automatically get appropriate rate limits
- Anonymous users seamlessly transition to IP-based tracking

## 🚀 Future Enhancements

1. **Usage Analytics**: Track and display usage patterns
2. **Dynamic Limits**: Adjust limits based on server load
3. **Premium Plans**: More granular paid tiers
4. **Abuse Detection**: Automatic escalation for suspicious patterns
5. **Quota Sharing**: Team-based rate limiting
6. **Model-Specific UI**: Show per-model usage in selector 