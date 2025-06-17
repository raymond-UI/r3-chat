// convex/messages.ts
import { query, mutation, internalMutation, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { rateLimiter, getModelRateLimitName, getUserRateLimitName, getRateLimitConfig } from "./rateLimitingConfig";
import { getUserType, getRateLimitKey } from "./utils";

// Get all messages for a conversation with active branch filtering and access control
export const list = query({
  args: { 
    conversationId: v.id("conversations"),
    isInviteAccess: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    // First, verify the user has access to this conversation
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(args.conversationId);
    
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        messages: [],
        canAccess: false,
      };
    }
    
    // Check if user has access to this conversation
    const hasAccess = await checkConversationAccess(ctx, conversation, identity, args.isInviteAccess);
    
    if (!hasAccess) {
      return {
        success: false,
        error: "Access denied: You don't have permission to view this conversation",
        messages: [],
        canAccess: false,
      };
    }

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    // Build conversation tree and return only active branch
    const messageTree = buildMessageTree(allMessages);
    const activeBranchMessages = getActiveBranchMessages(messageTree);

    // 🚀 OPTIMIZED: Get all files for the conversation at once, then filter
    let allFiles: Doc<"files">[] = [];
    
    try {
      // Get all files for this conversation in a single query
      allFiles = await ctx.db
        .query("files")
        .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
        .collect();
    } catch (error) {
      console.error(`Error fetching files for conversation:`, error);
    }

    // Group files by message ID for O(1) lookup
    const filesByMessageId = new Map<string, Doc<"files">[]>();
    allFiles.forEach(file => {
      if (file.messageId) {
        if (!filesByMessageId.has(file.messageId)) {
          filesByMessageId.set(file.messageId, []);
        }
        filesByMessageId.get(file.messageId)!.push(file);
      }
    });

    // Attach files to messages efficiently - only files that belong to active branch messages
    const messagesWithFiles = activeBranchMessages.map(message => ({
      ...message,
      attachedFiles: filesByMessageId.get(message._id) || [],
    }));

    return {
      success: true,
      error: null,
      messages: messagesWithFiles,
      canAccess: true,
    };
  },
});

// 🚀 NEW: Optimized message list with minimal data for UI performance
export const listMinimal = query({
  args: { 
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
    isInviteAccess: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    // Check access
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(args.conversationId);
    
    if (!conversation) {
      return { success: false, error: "Conversation not found", messages: [] };
    }
    
    const hasAccess = await checkConversationAccess(ctx, conversation, identity, args.isInviteAccess);
    if (!hasAccess) {
      return { success: false, error: "Access denied", messages: [] };
    }

    // Get messages efficiently with active branch filtering
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_active", (q) => 
        q.eq("conversationId", args.conversationId)
         .eq("isActiveBranch", true)
      )
      .order("asc")
      .take(limit);

    // Return only essential fields for UI
    const minimalMessages = messages.map(msg => ({
      _id: msg._id,
      conversationId: msg.conversationId,
      userId: msg.userId,
      senderName: msg.senderName,
      content: msg.content,
      timestamp: msg.timestamp,
      type: msg.type,
      aiModel: msg.aiModel,
      status: msg.status,
      // Skip heavy fields like attachments, branching data
    }));

    return { 
      success: true, 
      messages: minimalMessages,
      canAccess: true 
    };
  },
});

// Get all branches for a specific message
export const getBranches = query({
  args: { parentMessageId: v.id("messages") },
  handler: async (ctx, { parentMessageId }) => {
    const branches = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => q.eq("parentMessageId", parentMessageId))
      .order("asc")
      .collect();

    return branches.sort((a, b) => (a.branchIndex || 0) - (b.branchIndex || 0));
  },
});

// Send a new message (updated to handle branching)
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
    senderName: v.optional(v.string()),
    content: v.string(),
    type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    aiModel: v.optional(v.string()),
    fileIds: v.optional(v.array(v.id("files"))), // File IDs to attach
    status: v.optional(v.union(v.literal("complete"), v.literal("streaming"), v.literal("error"))),
    streamingForUser: v.optional(v.string()),
    // 🌿 Branching parameters
    parentMessageId: v.optional(v.id("messages")),
    branchIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Rate limiting - only apply to user messages, not AI responses
    if (args.type === "user") {
      const identity = await ctx.auth.getUserIdentity();
      const userType = getUserType(identity);
      const rateLimitKey = getRateLimitKey(identity);
      
      // Check user-level rate limit
      const userLimitName = getUserRateLimitName(userType);
      const userConfig = getRateLimitConfig(userLimitName);
      const userLimitResult = await rateLimiter.limit(ctx, userLimitName, {
        key: rateLimitKey,
        config: userConfig,
      });
      
      if (!userLimitResult.ok) {
        const retrySeconds = userLimitResult.retryAfter ? Math.ceil(userLimitResult.retryAfter / 1000) : 60;
        throw new Error(`Rate limit exceeded. Please try again in ${retrySeconds} seconds.`);
      }
      
      // Check model-specific rate limit if AI model is specified
      if (args.aiModel) {
        const modelLimitNameDaily = getModelRateLimitName(args.aiModel, "daily");
        const modelLimitNameMonthly = getModelRateLimitName(args.aiModel, "monthly");
        
        const dailyConfig = getRateLimitConfig(modelLimitNameDaily);
        const monthlyConfig = getRateLimitConfig(modelLimitNameMonthly);
        
        // Check daily limit
        const dailyLimitResult = await rateLimiter.limit(ctx, modelLimitNameDaily, {
          key: rateLimitKey,
          config: dailyConfig,
        });
        
        if (!dailyLimitResult.ok) {
          const retrySeconds = dailyLimitResult.retryAfter ? Math.ceil(dailyLimitResult.retryAfter / 1000) : 3600;
          throw new Error(`Daily model usage limit exceeded for ${args.aiModel}. Please try again in ${retrySeconds} seconds.`);
        }
        
        // Check monthly limit
        const monthlyLimitResult = await rateLimiter.limit(ctx, modelLimitNameMonthly, {
          key: rateLimitKey,
          config: monthlyConfig,
        });
        
        if (!monthlyLimitResult.ok) {
          throw new Error(`Monthly model usage limit exceeded for ${args.aiModel}. Please upgrade your plan or try again next month.`);
        }
      }
    }
    
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
    
    // If this is a branch, mark previous branches as inactive
    if (args.parentMessageId && args.branchIndex !== undefined) {
      const existingBranches = await ctx.db
        .query("messages")
        .withIndex("by_parent", (q) => q.eq("parentMessageId", args.parentMessageId))
        .collect();
      
      // Mark all existing branches as inactive
      for (const branch of existingBranches) {
        await ctx.db.patch(branch._id, { isActiveBranch: false });
      }
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId: args.userId,
      senderName: args.senderName,
      content: args.content,
      type: args.type,
      aiModel: args.aiModel,
      timestamp: now,
      status: args.status || "complete",
      streamingForUser: args.streamingForUser,
      lastUpdated: now,
      attachments,
      // 🌿 Branching fields
      parentMessageId: args.parentMessageId,
      branchIndex: args.branchIndex || 0,
      isActiveBranch: true, // New messages are always active
      branchCreatedBy: args.userId,
      branchCreatedAt: now,
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

// 🌿 Create a new branch from an existing message
export const createBranch = mutation({
  args: {
    parentMessageId: v.id("messages"),
    userId: v.string(),
    content: v.string(),
    type: v.union(v.literal("user"), v.literal("ai"), v.literal("system")),
    aiModel: v.optional(v.string()),
  },
  handler: async (ctx, { parentMessageId, userId, content, type, aiModel }) => {
    const parentMessage = await ctx.db.get(parentMessageId);
    if (!parentMessage) throw new Error("Parent message not found");

    // Get existing branches to determine next branch index
    const existingBranches = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => q.eq("parentMessageId", parentMessageId))
      .collect();

    // Mark all existing branches as inactive
    for (const branch of existingBranches) {
      await ctx.db.patch(branch._id, { isActiveBranch: false });
    }

    const nextBranchIndex = existingBranches.length + 1;
    const now = Date.now();

    const branchId = await ctx.db.insert("messages", {
      conversationId: parentMessage.conversationId,
      userId,
      content,
      type,
      aiModel,
      timestamp: now,
      status: "complete",
      lastUpdated: now,
      // 🌿 Branching fields
      parentMessageId,
      branchIndex: nextBranchIndex,
      isActiveBranch: true,
      branchCreatedBy: userId ,
      branchCreatedAt: now,
    });

    return branchId;
  },
});

// 🌿 Switch to a different branch
export const switchBranch = mutation({
  args: {
    parentMessageId: v.id("messages"),
    branchIndex: v.number(),
  },
  handler: async (ctx, { parentMessageId, branchIndex }) => {
    const branches = await ctx.db
      .query("messages")
      .withIndex("by_parent", (q) => q.eq("parentMessageId", parentMessageId))
      .collect();

    // Mark all branches as inactive
    for (const branch of branches) {
      await ctx.db.patch(branch._id, { isActiveBranch: false });
    }

    // Mark the selected branch as active
    const targetBranch = branches.find(b => b.branchIndex === branchIndex);
    if (targetBranch) {
      await ctx.db.patch(targetBranch._id, { isActiveBranch: true });
      return targetBranch._id;
    }

    throw new Error("Branch not found");
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

// 🌿 Helper functions for message tree handling
type MessageWithBranches = Doc<"messages"> & {
  branches: MessageWithBranches[];
};

type MessageTree = {
  messageMap: Map<string, MessageWithBranches>;
  roots: MessageWithBranches[];
};

function buildMessageTree(messages: Doc<"messages">[]): MessageTree {
  const messageMap = new Map<string, MessageWithBranches>();
  const roots: MessageWithBranches[] = [];

  // Create a map of all messages
  messages.forEach(msg => {
    messageMap.set(msg._id, { ...msg, branches: [] });
  });

  // Build the tree structure
  messages.forEach(msg => {
    if (msg.parentMessageId) {
      const parent = messageMap.get(msg.parentMessageId);
      if (parent) {
        parent.branches.push(messageMap.get(msg._id)!);
      }
    } else {
      roots.push(messageMap.get(msg._id)!);
    }
  });

  return { messageMap, roots };
}

function getActiveBranchMessages(tree: MessageTree): Doc<"messages">[] {
  const activeBranchMessages: Doc<"messages">[] = [];
  
  function traverse(messages: MessageWithBranches[]): void {
    for (const msg of messages) {
      activeBranchMessages.push(msg);
      
      // Find active branch among children
      const activeBranch = msg.branches.find((branch: MessageWithBranches) => branch.isActiveBranch);
      if (activeBranch) {
        traverse([activeBranch]);
      } else if (msg.branches.length > 0) {
        // If no active branch is marked, use the first one (original)
        traverse([msg.branches[0]]);
      }
    }
  }

  traverse(tree.roots);
  return activeBranchMessages;
}

// Helper function to check conversation access (shared with conversations.ts logic)
export async function checkConversationAccess(
  ctx: QueryCtx,
  conversation: Doc<"conversations">,
  identity: { subject: string } | null,
  isInviteAccess?: boolean
): Promise<boolean> {
  // 1. Allow if conversation is publicly shared
  if (conversation.sharing?.isPublic) {
    return true;
  }
  
  // 2. Allow if user is authenticated and is a participant
  if (identity && conversation.participants.includes(identity.subject)) {
    return true;
  }
  
  // 3. Allow if user is the creator
  if (identity && conversation.createdBy === identity.subject) {
    return true;
  }
  
  // 4. Allow anonymous access if conversation allows it and is public
  if (!identity && conversation.sharing?.isPublic && conversation.sharing?.allowAnonymous) {
    return true;
  }
  
  // 5. Allow anonymous users access to their own conversations
  if (!identity && conversation.createdBy?.startsWith("anonymous_")) {
    // This is tricky - we can't verify anonymous ownership server-side
    // The client should handle this case by tracking anonymous conversation IDs
    return true;
  }
  
  // 6. 🎫 Allow invite access - users can view conversation details when accessing via invite
  if (isInviteAccess && identity) {
    return true;
  }
  
  return false;
} 