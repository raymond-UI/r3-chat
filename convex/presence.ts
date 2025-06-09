import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get presence for a conversation
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const presence = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .collect();
    
    return presence;
  },
});

// Update user presence
export const update = mutation({
  args: { 
    userId: v.string(),
    conversationId: v.id("conversations"),
    isTyping: v.boolean()
  },
  handler: async (ctx, { userId, conversationId, isTyping }) => {
    // Check if presence record exists
    const existing = await ctx.db
      .query("presence")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("conversationId"), conversationId)
        )
      )
      .first();

    if (existing) {
      // Update existing presence
      await ctx.db.patch(existing._id, {
        lastSeen: Date.now(),
        isTyping,
      });
    } else {
      // Create new presence record
      await ctx.db.insert("presence", {
        userId,
        conversationId,
        lastSeen: Date.now(),
        isTyping,
      });
    }
  },
});

// Clear typing status for a user
export const clearTyping = mutation({
  args: { 
    userId: v.string(),
    conversationId: v.id("conversations")
  },
  handler: async (ctx, { userId, conversationId }) => {
    const existing = await ctx.db
      .query("presence")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("conversationId"), conversationId)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isTyping: false,
        lastSeen: Date.now(),
      });
    }
  },
});

// Remove old presence records (cleanup)
export const cleanup = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - (1000 * 60 * 30); // 30 minutes ago
    const oldPresence = await ctx.db
      .query("presence")
      .filter((q) => q.lt(q.field("lastSeen"), cutoff))
      .collect();

    for (const record of oldPresence) {
      await ctx.db.delete(record._id);
    }
  },
}); 