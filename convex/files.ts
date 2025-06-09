import { v } from "convex/values";
import { mutation, query, action, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { env } from "@/env";

// Create a new file record
export const create = mutation({
  args: {
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

    // Trigger AI analysis in the background
    await ctx.scheduler.runAfter(0, internal.files.analyzeFile, {
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

// Get a specific file (internal)
export const getById = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.fileId);
  },
});

// Update file with analysis result (internal)
export const updateAnalysis = internalMutation({
  args: {
    fileId: v.id("files"),
    analysisResult: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.fileId, {
      analysisResult: args.analysisResult,
    });
  },
});

// AI analysis action (internal)
export const analyzeFile = internalAction({
  args: { fileId: v.id("files") },
  handler: async (ctx, args) => {
    const file = await ctx.runQuery(internal.files.getById, {
      fileId: args.fileId,
    });

    if (!file) return;

    try {
      let analysisPrompt = "";
      
      if (file.type === "image") {
        analysisPrompt = `Analyze this image and provide a detailed description. Focus on:
- Main subjects and objects
- Colors, lighting, and composition
- Text content if any
- Context and setting
- Any notable details or interesting elements`;
      } else if (file.type === "pdf" && file.extractedText) {
        analysisPrompt = `Analyze this PDF document content and provide a summary. Focus on:
- Main topics and themes
- Key points and insights
- Document structure and organization
- Important data or findings
- Actionable items or conclusions

Document content: ${file.extractedText.slice(0, 3000)}...`;
      } else {
        analysisPrompt = `Analyze this file (${file.name}) and provide relevant insights about its content and purpose.`;
      }

      // Use your existing OpenRouter API integration
      const openai = new (await import("openai")).OpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
      });

      const response = await openai.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that analyzes uploaded files and provides helpful insights and descriptions.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      const analysis = response.choices[0]?.message?.content || "Unable to analyze file";

      // Update the file with analysis
      await ctx.runMutation(internal.files.updateAnalysis, {
        fileId: args.fileId,
        analysisResult: analysis,
      });

    } catch (error) {
      console.error("File analysis failed:", error);
      await ctx.runMutation(internal.files.updateAnalysis, {
        fileId: args.fileId,
        analysisResult: "Analysis failed - please try again later",
      });
    }
  },
});

// Extract text from PDF (you might want to implement this server-side)
export const extractPdfText = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
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