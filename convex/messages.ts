import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all messages for a conversation
export const list = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    // Get attached files for each message
    const messagesWithFiles = await Promise.all(
      messages.map(async (message) => {
        const files = await ctx.db
          .query("files")
          .filter((q) => q.eq(q.field("messageId"), message._id))
          .collect();
        
        return {
          ...message,
          attachedFiles: files,
        };
      })
    );

    return messagesWithFiles;
  },
});

// Send a new message
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    content: v.string(),
    type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    aiModel: v.optional(v.string()),
    fileIds: v.optional(v.array(v.id("files"))), // File IDs to attach
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      content: args.content,
      type: args.type,
      aiModel: args.aiModel,
      timestamp: Date.now(),
    });

    // Update file records with message ID if files are attached
    if (args.fileIds && args.fileIds.length > 0) {
      for (const fileId of args.fileIds) {
        await ctx.db.patch(fileId, { messageId });
      }
    }

    // Update conversation's last message and timestamp
    await ctx.db.patch(args.conversationId, {
      lastMessage: args.content,
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

// Delete a message
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
}); 