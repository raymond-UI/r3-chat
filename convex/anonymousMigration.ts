import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Migration function to transfer anonymous conversations to a user account
export const migrateAnonymousConversations = mutation({
  args: {
    anonymousConversationIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User must be authenticated");
    }

    const results = [];

    for (const conversationIdStr of args.anonymousConversationIds) {
      try {
        // Convert string to proper ID type
        const conversationId = conversationIdStr as Id<"conversations">;
        
        // Find the conversation
        const conversation = await ctx.db.get(conversationId);
        
        if (!conversation) {
          console.warn(`Conversation ${conversationIdStr} not found`);
          continue;
        }

        // Check if conversation is already owned by someone
        if ("createdBy" in conversation && conversation.createdBy) {
          // Check if it's not an anonymous conversation (anonymous conversations start with "anonymous_")
          if (!conversation.createdBy.startsWith("anonymous_") && conversation.createdBy !== "anonymous") {
            console.warn(`Conversation ${conversationIdStr} already has an owner`);
            continue;
          }
        }

        // Update the conversation to associate it with the user
        await ctx.db.patch(conversationId, {
          createdBy: identity.subject,
          participants: ("participants" in conversation && conversation.participants?.includes(identity.subject)) 
            ? conversation.participants 
            : [...(("participants" in conversation && conversation.participants?.filter((p: string) => !p.startsWith("anonymous_") && p !== "anonymous")) || []), identity.subject],
        });

        // Update all messages in this conversation to associate them with the user
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
          .collect();

        for (const message of messages) {
          // Check for both "anonymous" and anonymous user IDs that start with "anonymous_"
          if (message.userId === "anonymous" || message.userId.startsWith("anonymous_")) {
            await ctx.db.patch(message._id, {
              userId: identity.subject,
            });
          }
        }

        results.push({
          conversationId: conversationIdStr,
          success: true,
          messagesUpdated: messages.filter(m => m.userId === "anonymous" || m.userId.startsWith("anonymous_")).length,
        });

      } catch (error) {
        console.error(`Failed to migrate conversation ${conversationIdStr}:`, error);
        results.push({
          conversationId: conversationIdStr,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  },
});

// Query to check if conversations exist and their current ownership status
export const checkAnonymousConversations = query({
  args: {
    anonymousConversationIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const results = [];

    for (const conversationIdStr of args.anonymousConversationIds) {
      try {
        const conversationId = conversationIdStr as Id<"conversations">;
        const conversation = await ctx.db.get(conversationId);
        
        if (!conversation) {
          continue;
        }

        // Check if this conversation is now owned by the current user
        const isOwned = ("createdBy" in conversation && conversation.createdBy === identity.subject) || 
                       ("participants" in conversation && conversation.participants?.includes(identity.subject));

        results.push({
          conversationId: conversationIdStr,
          exists: true,
          isOwned,
          title: "title" in conversation ? conversation.title : "Untitled",
        });

      } catch (error) {
        console.error(`Failed to check conversation ${conversationIdStr}:`, error);
      }
    }

    return results;
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