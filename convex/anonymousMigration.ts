import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Migrate conversations from anonymous to authenticated user
export const migrateAnonymousConversations = mutation({
  args: {
    anonymousId: v.string(),
  },
  handler: async (ctx, { anonymousId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Find all conversations created by this anonymous ID
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("createdBy"), anonymousId))
      .collect();

    const results = [];

    // Update each conversation
    for (const conversation of conversations) {
      // Update conversation ownership
      await ctx.db.patch(conversation._id, {
        createdBy: identity.subject,
        participants: [identity.subject],
        updatedAt: Date.now(),
      });

      results.push({
        conversationId: conversation._id,
        title: conversation.title,
        success: true,
      });
    }

    return {
      migratedCount: results.length,
      details: results,
    };
  },
});

// Query to check if conversations exist for an anonymous user
export const checkAnonymousConversations = query({
  args: {
    anonymousId: v.string(),
  },
  handler: async (ctx, { anonymousId }) => {
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("createdBy"), anonymousId))
      .collect();

    return conversations.map(conv => ({
      conversationId: conv._id,
      exists: true,
      title: conv.title || "Untitled",
      createdAt: conv.createdAt,
    }));
  },
});

// Clean up function to remove truly orphaned anonymous conversations (optional)
export const cleanupOrphanedAnonymousConversations = mutation({
  args: {
    olderThanDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const olderThanDays = args.olderThanDays || 7; // Default to 7 days
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    // Find anonymous conversations older than the cutoff
    const orphanedConversations = await ctx.db
      .query("conversations")
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("createdBy"), "anonymous"),
            q.eq(q.field("createdBy"), undefined),
            // Note: We can't use startsWith in Convex filters directly
            // This would need to be done in post-processing
          ),
          q.lt(q.field("createdAt"), cutoffTime)
        )
      )
      .collect();

    // Filter to only include truly anonymous conversations
    const filteredOrphanedConversations = orphanedConversations.filter(conversation => {
      if (!conversation.createdBy) return true;
      return conversation.createdBy === "anonymous" || conversation.createdBy.startsWith("anonymous_");
    });

    let deletedCount = 0;

    for (const conversation of filteredOrphanedConversations) {
      try {
        // Delete all messages in this conversation
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .collect();

        for (const message of messages) {
          await ctx.db.delete(message._id);
        }

        // Delete the conversation
        await ctx.db.delete(conversation._id);
        deletedCount++;

      } catch (error) {
        console.error(`Failed to delete conversation ${conversation._id}:`, error);
      }
    }

    return {
      deletedCount,
      totalFound: filteredOrphanedConversations.length,
    };
  },
});

// Helper function to get conversations that need migration
export const getConversationsNeedingMigration = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Find conversations that are anonymous or don't have an owner
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => 
        q.or(
          q.eq(q.field("createdBy"), "anonymous"),
          q.eq(q.field("createdBy"), undefined)
        )
      )
      .collect();

    // Filter to include conversations with anonymous_ prefix as well
    const anonymousConversations = conversations.filter(conv => {
      if (!conv.createdBy) return true;
      return conv.createdBy === "anonymous" || conv.createdBy.startsWith("anonymous_");
    });

    return anonymousConversations.map(conv => ({
      id: conv._id,
      title: conv.title,
      createdAt: conv.createdAt,
      messageCount: 0, // We could count messages if needed
    }));
  },
}); 