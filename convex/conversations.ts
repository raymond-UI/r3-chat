import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { checkConversationAccess } from "./messages";

// Get all conversations for a user
export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();
    
    return allConversations.filter(conversation => 
      conversation.participants.includes(userId)
    );
  },
});

// Get conversations by their IDs (for anonymous users)
export const getByIds = query({
  args: { conversationIds: v.array(v.string()) },
  handler: async (ctx, { conversationIds }) => {
    const conversations = [];
    
    for (const idStr of conversationIds) {
      try {
        const conversation = await ctx.db.get(idStr as Id<"conversations">);
        if (conversation && conversation._id) {
          conversations.push(conversation);
        }
      } catch {
        // Skip invalid IDs
        console.warn(`Invalid conversation ID: ${idStr}`);
      }
    }
    
    // Sort by updatedAt descending, with fallback to _creationTime
    return conversations.sort((a, b) => {
      const aTime = "updatedAt" in a && a.updatedAt ? a.updatedAt : a._creationTime;
      const bTime = "updatedAt" in b && b.updatedAt ? b.updatedAt : b._creationTime;
      return bTime - aTime;
    });
  },
});

// Get a single conversation by ID with proper access control
export const get = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      return {
        success: false,
        error: "Conversation not found",
        conversation: null,
        canAccess: false,
      };
    }

    // Check if user has access to this conversation
    const hasAccess = await checkConversationAccess(ctx, conversation, identity);
    
    if (!hasAccess) {
      return {
        success: false,
        error: "Access denied: You don't have permission to view this conversation",
        conversation: null,
        canAccess: false,
      };
    }

    return {
      success: true,
      error: null,
      conversation,
      canAccess: true,
    };
  },
});




// Create a new conversation
export const create = mutation({
  args: {
    title: v.optional(v.string()),
    isCollaborative: v.optional(v.boolean()),
    participants: v.optional(v.array(v.string())),
    isAnonymous: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    
    // Support anonymous users
    let createdBy: string;
    let participants: string[];
    
    if (!identity && args.isAnonymous) {
      // Anonymous user - create a temporary unique identifier
      createdBy = `anonymous_${crypto.randomUUID()}`;
      participants = [createdBy, ...(args.participants || [])];
    } else if (identity) {
      // Authenticated user
      createdBy = identity.subject;
      participants = [identity.subject, ...(args.participants || [])];
    } else {
      throw new Error("Not authenticated");
    }

    const conversationId = await ctx.db.insert("conversations", {
      title: args.title || "New Chat",
      participants,
      isCollaborative: args.isCollaborative || false,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      // Add sharing configuration
      sharing: {
        isPublic: false,
        shareId: crypto.randomUUID(),
        requiresPassword: false,
        allowAnonymous: false,
        expiresAt: undefined,
      }
    });

    return conversationId;
  },
});

// Add a participant to a collaborative conversation
export const addParticipant = mutation({
  args: { 
    conversationId: v.id("conversations"),
    userId: v.string()
  },
  handler: async (ctx, { conversationId, userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    // Only allow existing participants or creator to add new participants
    if (!identity) {
      throw new Error("Authentication required");
    }
    
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Access denied: You don't have permission to add participants to this conversation");
    }
    
    if (!conversation.participants.includes(userId)) {
      await ctx.db.patch(conversationId, {
        participants: [...conversation.participants, userId],
        updatedAt: Date.now(),
      });
    }
  },
});

// Update conversation title
export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, { conversationId, title }) => {
    const identity = await ctx.auth.getUserIdentity();
    const conversation = await ctx.db.get(conversationId);
    
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    
    // Only allow participants or creator to update title
    if (!identity) {
      throw new Error("Authentication required");
    }
    
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Access denied: You don't have permission to modify this conversation");
    }
    
    await ctx.db.patch(conversationId, {
      title,
      updatedAt: Date.now(),
    });
  },
});

// Update last message
export const updateLastMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    lastMessage: v.string(),
  },
  handler: async (ctx, { conversationId, lastMessage }) => {
    await ctx.db.patch(conversationId, {
      lastMessage,
      updatedAt: Date.now(),
    });
  },
});

// Delete a conversation and all its messages
export const remove = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    // Delete all messages in the conversation first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete all files associated with the conversation
    const files = await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .collect();
    
    for (const file of files) {
      await ctx.db.delete(file._id);
    }

    // Delete presence records for this conversation
    const presenceRecords = await ctx.db
      .query("presence")
      .filter((q) => q.eq(q.field("conversationId"), conversationId))
      .collect();
    
    for (const presence of presenceRecords) {
      await ctx.db.delete(presence._id);
    }

    // Remove from pinned conversations for all users
    const userPrefs = await ctx.db
      .query("userPreferences")
      .collect();
    
    for (const pref of userPrefs) {
      if (pref.pinnedConversations.includes(conversationId)) {
        await ctx.db.patch(pref._id, {
          pinnedConversations: pref.pinnedConversations.filter(id => id !== conversationId),
          updatedAt: Date.now(),
        });
      }
    }

    // Finally, delete the conversation
    await ctx.db.delete(conversationId);
  },
});

// Note: Migration completed - threadId field removed from all conversations
// Agent now handles thread management internally with string identifiers
// No need to store threadId in conversation table 

// 🌳 Create a new conversation branch from a specific message point
export const createConversationBranch = mutation({
  args: {
    parentConversationId: v.id("conversations"),
    branchAtMessageId: v.id("messages"),
    userId: v.string(),
    title: v.optional(v.string()),
  },
  handler: async (ctx, { parentConversationId, branchAtMessageId, userId, title }) => {
    const parentConversation = await ctx.db.get(parentConversationId);
    if (!parentConversation) throw new Error("Parent conversation not found");

    const branchMessage = await ctx.db.get(branchAtMessageId);
    if (!branchMessage) throw new Error("Branch message not found");

    // Get all messages up to and including the branch point
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", parentConversationId))
      .order("asc")
      .collect();

    // Filter messages up to the branch point (inclusive)
    const messagesToCopy = allMessages.filter(msg => msg.timestamp <= branchMessage.timestamp);

    const now = Date.now();
    
    // Generate a better title with versioning
    let branchedTitle: string;
    if (title) {
      branchedTitle = title;
    } else {
      // Check how many branches exist from this parent
      const existingBranches = await ctx.db
        .query("conversations")
        .filter((q) => q.eq(q.field("parentConversationId"), parentConversationId))
        .collect();
      
      const versionNumber = existingBranches.length + 2; // +2 because original is v1, first branch is v2
      branchedTitle = `${parentConversation.title} v${versionNumber}`;
    }

    // Create the new branched conversation
    const newConversationId = await ctx.db.insert("conversations", {
      title: branchedTitle,
      participants: parentConversation.participants,
      lastMessage: branchMessage.content,
      createdAt: now,
      updatedAt: now,
      isCollaborative: parentConversation.isCollaborative,
      createdBy: userId,
      // 🌳 Branching metadata
      parentConversationId,
      branchedAtMessageId: branchAtMessageId,
      branchedBy: userId,
      branchedAt: now,
      // 🔗 Sharing - inherit from parent but make it private by default
      sharing: {
        isPublic: false,
        shareId: crypto.randomUUID(),
        requiresPassword: false,
        allowAnonymous: false,
        expiresAt: undefined,
      }
    });

    // Copy all messages up to the branch point
    for (const message of messagesToCopy) {
      await ctx.db.insert("messages", {
        conversationId: newConversationId,
        userId: message.userId,
        content: message.content,
        type: message.type,
        aiModel: message.aiModel,
        timestamp: message.timestamp,
        status: message.status || "complete",
        lastUpdated: message.lastUpdated || message.timestamp,
        attachments: message.attachments,
        // Reset branching fields for the new conversation
        parentMessageId: undefined,
        branchIndex: undefined,
        isActiveBranch: undefined,
        branchCreatedBy: undefined,
        branchCreatedAt: undefined,
      });
    }

    return newConversationId;
  },
});

// Get conversation branch info
export const getConversationBranchInfo = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;

    if (!conversation.parentConversationId) {
      return { isBranched: false };
    }

    const parentConversation = await ctx.db.get(conversation.parentConversationId);
    const branchMessage = conversation.branchedAtMessageId 
      ? await ctx.db.get(conversation.branchedAtMessageId)
      : null;

    return {
      isBranched: true,
      parentConversation,
      branchedAtMessage: branchMessage,
      branchedBy: conversation.branchedBy,
      branchedAt: conversation.branchedAt,
    };
  },
});

// Get all child branches of a conversation
export const getConversationBranches = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("conversations")
      .filter((q) => q.eq(q.field("parentConversationId"), conversationId))
      .order("desc")
      .collect();
  },
});

// Update sharing settings
export const updateSharing = mutation({
  args: {
    conversationId: v.id("conversations"),
    sharing: v.object({
      isPublic: v.boolean(),
      requiresPassword: v.boolean(),
      password: v.optional(v.string()),
      allowAnonymous: v.boolean(),
      expiresAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user is participant or creator
    if (!conversation.participants.includes(identity.subject) && 
        conversation.createdBy !== identity.subject) {
      throw new Error("Not authorized");
    }

    const currentSharing = conversation.sharing || {
      isPublic: false,
      shareId: crypto.randomUUID(),
      requiresPassword: false,
      allowAnonymous: false,
      expiresAt: undefined,
    };

    const updatedSharing = {
      ...currentSharing,
      ...args.sharing,
      // Generate new shareId if making public for first time
      shareId: currentSharing.shareId || crypto.randomUUID(),
    };

    await ctx.db.patch(args.conversationId, {
      sharing: updatedSharing,
      updatedAt: Date.now(),
    });

    return updatedSharing;
  },
});

// Get conversation by share ID (public access)
export const getByShareId = query({
  args: { shareId: v.string(), password: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .filter(q => q.eq(q.field("sharing.shareId"), args.shareId))
      .first();

    if (!conversation || !conversation.sharing) return null;

    // Check if sharing is enabled
    if (!conversation.sharing.isPublic) return null;

    // Check expiration
    if (conversation.sharing.expiresAt && Date.now() > conversation.sharing.expiresAt) {
      return null;
    }

    // Check password if required
    if (conversation.sharing.requiresPassword) {
      if (!args.password || args.password !== conversation.sharing.password) {
        return { requiresPassword: true };
      }
    }

    return {
      ...conversation,
      // Don't expose sensitive sharing details in public view
      sharing: {
        isPublic: true,
        allowAnonymous: conversation.sharing.allowAnonymous,
      }
    };
  },
}); 