import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all messages for a conversation
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const messages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .order("asc")
      .collect();
    
    return messages;
  },
});

// Send a new message
export const send = mutation({
  args: { 
    conversationId: v.id("conversations"),
    userId: v.string(),
    content: v.string(),
    type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    aiModel: v.optional(v.string())
  },
  handler: async (ctx, { conversationId, userId, content, type, aiModel }) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId,
      userId,
      content,
      type,
      aiModel,
      timestamp: Date.now(),
    });

    // Update conversation's lastMessage and updatedAt
    await ctx.db.patch(conversationId, {
      lastMessage: content.substring(0, 100),
      updatedAt: Date.now(),
    });
    
    return messageId;
  },
});

// Delete a message
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    await ctx.db.delete(messageId);
  },
}); 