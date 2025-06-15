import { v } from "convex/values";
import { mutation, query, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Create a new file record
export const create = mutation({
  args: {
    key: v.string(),
    name: v.string(),
    type: v.string(),
    mimeType: v.string(),
    size: v.number(),
    url: v.string(),
    uploadedBy: v.string(),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
    extractedText: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const fileId = await ctx.db.insert("files", {
      key: args.key,
      name: args.name,
      type: args.type,
      mimeType: args.mimeType,
      size: args.size,
      url: args.url,
      uploadedBy: args.uploadedBy,
      conversationId: args.conversationId,
      messageId: args.messageId,
      uploadedAt: Date.now(),
      extractedText: args.extractedText,
      thumbnailUrl: args.thumbnailUrl,
    });

    // Trigger text extraction only (no AI analysis)
    await ctx.scheduler.runAfter(0, internal.files.extractFileContent, {
      fileId,
    });

    return fileId;
  },
});

// Get files for a conversation
export const getByConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("files")
      .filter((q) => q.eq(q.field("conversationId"), args.conversationId))
      .order("desc")
      .collect();
  },
});

// Get a specific file
export const getById = query({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

// Get a specific file (internal)
export const getByIdInternal = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

// Update file with extracted text and analysis result (internal)
export const updateFileContent = internalMutation({
  args: {
    fileId: v.id("files"),
    extractedText: v.optional(v.string()),
    analysisResult: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updateData: { extractedText?: string; analysisResult?: string } = {};
    if (args.extractedText !== undefined) {
      updateData.extractedText = args.extractedText;
    }
    if (args.analysisResult !== undefined) {
      updateData.analysisResult = args.analysisResult;
    }
    
    await ctx.db.patch(args.fileId, updateData);
  },
});

// Extract text content from file (internal)
export const extractFileContent = internalAction({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.runQuery(internal.files.getByIdInternal, {
      fileId: args.fileId,
    });

    if (!file) return;

    try {
      let extractedText = "";
      
      // Note: PDF text extraction removed to avoid Node.js dependencies in Convex
      // PDFs are now passed directly to AI models that support file processing
      if (file.type === "pdf" || file.mimeType === "application/pdf") {
        console.log(`PDF file processed: ${file.name} - will be passed directly to AI for analysis`);
        extractedText = `PDF file: ${file.name} (${Math.round(file.size / 1024)}KB) - ready for AI analysis`;
        
        // Update file with metadata
        await ctx.runMutation(internal.files.updateFileContent, {
          fileId: args.fileId,
          extractedText,
        });
      }

    } catch (error) {
      console.error("File content extraction failed:", error);
    }
  },
});

// Extract text from PDF (you might want to implement this server-side)
export const extractPdfText = action({
  args: { url: v.string() },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handler: async (_ctx, _args) => {
    try {
      // This would typically be done server-side
      // For now, we'll return a placeholder
      // In production, you'd fetch the PDF and extract text
      return "PDF text extraction not yet implemented";
    } catch (error) {
      console.error("PDF text extraction failed:", error);
      return "";
    }
  },
});

// Manual trigger for text extraction (for testing/re-processing)
export const triggerTextExtraction = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    // Trigger text extraction
    await ctx.scheduler.runAfter(0, internal.files.extractFileContent, {
      fileId: args.fileId,
    });
    
    return { success: true, message: "Text extraction triggered" };
  },
}); 