import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// 🚀 BANDWIDTH OPTIMIZATION: Update pre-computed conversation statistics
export const updateConversationStats = internalMutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return;

    // Get counts efficiently
    const [likes, views, messages] = await Promise.all([
      ctx.db
        .query("conversationLikes")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect(),
      ctx.db
        .query("profileViews")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect(),
      ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect(),
    ]);

    const stats = {
      conversationId,
      viewCount: views.length,
      likeCount: likes.length,
      messageCount: messages.length,
      lastUpdated: Date.now(),
      // Cache frequently accessed data to avoid joins
      isPublic: conversation.sharing?.isPublic || false,
      isShownOnProfile: conversation.showcase?.isShownOnProfile || false,
      isFeatured: conversation.showcase?.isFeatured || false,
      tags: conversation.showcase?.tags || [],
    };

    // Upsert stats
    const existing = await ctx.db
      .query("conversationStats")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, stats);
    } else {
      await ctx.db.insert("conversationStats", stats);
    }
  },
});

// Batch update stats for multiple conversations
export const batchUpdateConversationStats = internalMutation({
  args: { conversationIds: v.array(v.id("conversations")) },
  handler: async (ctx, { conversationIds }) => {
    for (const conversationId of conversationIds) {
      // Call the update function directly within the same context
      const conversation = await ctx.db.get(conversationId);
      if (!conversation) continue;

      // Get counts efficiently
      const [likes, views, messages] = await Promise.all([
        ctx.db
          .query("conversationLikes")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .collect(),
        ctx.db
          .query("profileViews")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .collect(),
        ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .collect(),
      ]);

      const stats = {
        conversationId,
        viewCount: views.length,
        likeCount: likes.length,
        messageCount: messages.length,
        lastUpdated: Date.now(),
        isPublic: conversation.sharing?.isPublic || false,
        isShownOnProfile: conversation.showcase?.isShownOnProfile || false,
        isFeatured: conversation.showcase?.isFeatured || false,
        tags: conversation.showcase?.tags || [],
      };

      // Upsert stats
      const existing = await ctx.db
        .query("conversationStats")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, stats);
      } else {
        await ctx.db.insert("conversationStats", stats);
      }
    }
  },
});

// Get conversations that need stats updates
export const getConversationsNeedingStatsUpdate = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) => {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Get conversations updated recently but with stale stats
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_updated", (q) => q.gt("updatedAt", cutoffTime))
      .take(limit);

    const conversationIds = conversations.map(c => c._id);
    
    // Check which ones have outdated stats
    const stats = await Promise.all(
      conversationIds.map(id =>
        ctx.db
          .query("conversationStats")
          .withIndex("by_conversation", (q) => q.eq("conversationId", id))
          .first()
      )
    );

    const needsUpdate = [];
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const stat = stats[i];
      
      if (!stat || stat.lastUpdated < conv.updatedAt) {
        needsUpdate.push(conv._id);
      }
    }

    return needsUpdate;
  },
});

// 🚀 OPTIMIZATION: Efficient analytics queries using pre-computed stats
export const getConversationAnalytics = internalQuery({
  args: { 
    userId: v.string(),
    timeRange: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"))),
  },
  handler: async (ctx, { userId, timeRange = "30d" }) => {
    const timeRangeMs = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    
    const cutoffTime = Date.now() - timeRangeMs[timeRange];

    // Get user's conversations efficiently
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .filter((q) => q.gt(q.field("updatedAt"), cutoffTime))
      .collect();

    const conversationIds = conversations.map(c => c._id);
    
    // Get pre-computed stats
    const stats = await Promise.all(
      conversationIds.map(id =>
        ctx.db
          .query("conversationStats")
          .withIndex("by_conversation", (q) => q.eq("conversationId", id))
          .first()
      )
    );

    // Calculate aggregate analytics
    let totalViews = 0;
    let totalLikes = 0;
    let totalMessages = 0;
    let publicConversations = 0;

    stats.forEach(stat => {
      if (stat) {
        totalViews += stat.viewCount;
        totalLikes += stat.likeCount;
        totalMessages += stat.messageCount;
        if (stat.isPublic) publicConversations++;
      }
    });

    return {
      totalConversations: conversations.length,
      totalViews,
      totalLikes,
      totalMessages,
      publicConversations,
      period: timeRange,
    };
  },
});

// Scheduled job to update stale conversation stats
export const updateStaleConversationStats = internalMutation({
  handler: async (ctx) => {
    // Get conversations that need updates inline
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_updated", (q) => q.gt("updatedAt", cutoffTime))
      .take(50);

    const conversationIds = conversations.map(c => c._id);
    
    // Check which ones have outdated stats
    const stats = await Promise.all(
      conversationIds.map(id =>
        ctx.db
          .query("conversationStats")
          .withIndex("by_conversation", (q) => q.eq("conversationId", id))
          .first()
      )
    );

    const needsUpdate = [];
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const stat = stats[i];
      
      if (!stat || stat.lastUpdated < conv.updatedAt) {
        needsUpdate.push(conv._id);
      }
    }
    
    if (needsUpdate.length > 0) {
      console.log(`Updating stats for ${needsUpdate.length} conversations`);
      
      // Update stats inline
      for (const conversationId of needsUpdate) {
        const conversation = await ctx.db.get(conversationId);
        if (!conversation) continue;

        const [likes, views, messages] = await Promise.all([
          ctx.db
            .query("conversationLikes")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect(),
          ctx.db
            .query("profileViews")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect(),
          ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect(),
        ]);

        const statsData = {
          conversationId,
          viewCount: views.length,
          likeCount: likes.length,
          messageCount: messages.length,
          lastUpdated: Date.now(),
          isPublic: conversation.sharing?.isPublic || false,
          isShownOnProfile: conversation.showcase?.isShownOnProfile || false,
          isFeatured: conversation.showcase?.isFeatured || false,
          tags: conversation.showcase?.tags || [],
        };

        const existing = await ctx.db
          .query("conversationStats")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, statsData);
        } else {
          await ctx.db.insert("conversationStats", statsData);
        }
      }
    }
  },
}); 