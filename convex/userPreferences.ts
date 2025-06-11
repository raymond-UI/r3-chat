import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get user preferences
export const get = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Return default preferences if none exist
    if (!preferences) {
      return {
        pinnedConversations: [],
      };
    }

    return {
      pinnedConversations: preferences.pinnedConversations,
    };
  },
});

// Pin a conversation for a user
export const pinConversation = mutation({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { userId, conversationId }) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      // Add to pinned if not already pinned
      if (!existing.pinnedConversations.includes(conversationId)) {
        await ctx.db.patch(existing._id, {
          pinnedConversations: [conversationId, ...existing.pinnedConversations],
          updatedAt: Date.now(),
        });
      }
    } else {
      // Create new preferences record
      const now = Date.now();
      await ctx.db.insert("userPreferences", {
        userId,
        pinnedConversations: [conversationId],
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Unpin a conversation for a user
export const unpinConversation = mutation({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { userId, conversationId }) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        pinnedConversations: existing.pinnedConversations.filter(
          (id) => id !== conversationId
        ),
        updatedAt: Date.now(),
      });
    }
  },
});

// Toggle pin status for a conversation
export const togglePin = mutation({
  args: {
    userId: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { userId, conversationId }) => {
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      const isPinned = existing.pinnedConversations.includes(conversationId);
      
      if (isPinned) {
        // Unpin
        await ctx.db.patch(existing._id, {
          pinnedConversations: existing.pinnedConversations.filter(
            (id) => id !== conversationId
          ),
          updatedAt: Date.now(),
        });
      } else {
        // Pin
        await ctx.db.patch(existing._id, {
          pinnedConversations: [conversationId, ...existing.pinnedConversations],
          updatedAt: Date.now(),
        });
      }
    } else {
      // Create new preferences record with this conversation pinned
      const now = Date.now();
      await ctx.db.insert("userPreferences", {
        userId,
        pinnedConversations: [conversationId],
        createdAt: now,
        updatedAt: now,
      });
    }
  },
}); 