import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
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
    status: v.optional(v.union(v.literal("complete"), v.literal("streaming"), v.literal("error"))),
    streamingForUser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Build attachments array if files are provided
    let attachments = undefined;
    if (args.fileIds && args.fileIds.length > 0) {
      const files = await Promise.all(
        args.fileIds.map(fileId => ctx.db.get(fileId))
      );
      
      attachments = files
        .filter(file => file !== null)
        .map(file => ({
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: file.url,
          extracted_content: file.extractedText || undefined,
        }));
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      content: args.content,
      type: args.type,
      aiModel: args.aiModel,
      timestamp: now,
      status: args.status || "complete",
      streamingForUser: args.streamingForUser,
      lastUpdated: now,
      attachments,
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
      updatedAt: now,
    });

    return messageId;
  },
});

// Update streaming message content and status
export const updateStreaming = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    status: v.optional(v.union(v.literal("streaming"), v.literal("complete"), v.literal("error"))),
  },
  handler: async (ctx, { messageId, content, status }) => {
    await ctx.db.patch(messageId, {
      content,
      lastUpdated: Date.now(),
      ...(status && { status }),
    });
  },
});

// Cleanup stale streaming messages
export const cleanupStaleStreaming = internalMutation({
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    const staleMessages = await ctx.db
      .query("messages")
      .withIndex("by_status", (q) => q.eq("status", "streaming"))
      .filter((q) => q.lt(q.field("lastUpdated"), oneHourAgo))
      .collect();

    for (const message of staleMessages) {
      await ctx.db.patch(message._id, {
        status: "error",
        content: message.content || "Message failed to complete",
        lastUpdated: Date.now(),
      });
    }
    
    console.log(`Cleaned up ${staleMessages.length} stale streaming messages`);
  },
});

// Schedule periodic cleanup
export const scheduleCleanup = internalMutation({
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(60 * 60 * 1000, internal.messages.cleanupStaleStreaming);
  },
});

// Delete a message
export const remove = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
}); 