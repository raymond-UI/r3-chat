import { action } from "./_generated/server";
import { v } from "convex/values";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createTool, Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { getAIModelsArray, type AIModel } from "@/types/ai";
import { env } from "@/env";
import { z } from "zod";
import { AI_PROMPTS, AGENT_CONFIG, MODEL_CONFIG } from "@/utils/prompts";
import { streamText } from "ai";

// Configure OpenRouter provider
const openRouterProvider = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

// Define tools for the agent
const webSearchTool = createTool({
  description: "Search the web for current information",
  args: z.object({
    query: z.string().describe("The search query"),
  }),
  handler: async (_ctx, args): Promise<string> => {
    // TODO: Implement with Tavily, Bing, or Google Search API
    // For now, return a placeholder
    return `Search results for "${args.query}": [Web search not yet implemented]`;
  },
});

const getCurrentTimeTool = createTool({
  description: "Get the current date and time in ISO format with timezone information",
  args: z.object({
    format: z.enum(['iso', 'local', 'utc']).optional().describe("The format to return the time in. Defaults to 'iso'"),
  }),
  handler: async (_ctx, args): Promise<string> => {
    const now = new Date();
    
    switch (args.format) {
      case 'local':
        return now.toLocaleString();
      case 'utc':
        return now.toUTCString();
      case 'iso':
      default:
        return now.toISOString();
    }
  },
});

// Create the main AI agent
const aiAgent = new Agent(components.agent, {
  // Chat completions model - using a more reliable model for tool calling
  chat: openRouterProvider(MODEL_CONFIG.MAIN_CHAT),

  // Default instructions
  instructions: AI_PROMPTS.MAIN_INSTRUCTIONS,

  // Available tools
  tools: {
    webSearch: webSearchTool,
    getCurrentTime: getCurrentTimeTool,
  },

  // Enable multi-step tool use
  maxSteps: AGENT_CONFIG.MAIN_AGENT.maxSteps,
  maxRetries: AGENT_CONFIG.MAIN_AGENT.maxRetries,

  // Track token usage
  usageHandler: async (ctx, { userId, threadId, model, usage }) => {
    console.log(
      `Token usage - User: ${userId}, Thread: ${threadId}, Model: ${model}, Tokens: ${usage.totalTokens}`
    );
    // TODO: Store usage in database for billing/analytics
  },
});

// Enhanced streaming with multi-user coordination using existing or new message
export const streamAgentResponse = action({
  args: {
    messageId: v.optional(v.id("messages")), // 🆕 Optional: use existing message
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    model: v.string(),
    userId: v.string(),
    // 🌿 Branching support
    parentMessageId: v.optional(v.id("messages")),
    branchIndex: v.optional(v.number()),
  },
  handler: async (
    ctx: ActionCtx,
    {
      messageId,
      conversationId,
      userMessage,
      model,
      userId,
      parentMessageId,
      branchIndex,
    }: {
      messageId?: Id<"messages">;
      conversationId: Id<"conversations">;
      userMessage: string;
      model: string;
      userId: string;
      parentMessageId?: Id<"messages">;
      branchIndex?: number;
    }
  ): Promise<{ messageId: Id<"messages">; fullText: string }> => {
    // Use existing message or create new one
    const aiMessageId = messageId || await ctx.runMutation(api.messages.send, {
      conversationId,
      userId: "ai-assistant",
      content: "",
      type: "ai",
      aiModel: model,
      status: "streaming",
      streamingForUser: userId, // Track who initiated
      // 🌿 Pass branching parameters
      parentMessageId,
      branchIndex,
    });

    try {
      let accumulatedContent = "";
      let lastUpdate = Date.now();
      const UPDATE_INTERVAL = 2000; // Update other users every 2 seconds

      const result = await streamText({
        model: openRouterProvider(model),
        prompt: userMessage,
        onChunk: async ({ chunk }) => {
          if (chunk.type === "text-delta") {
            accumulatedContent += chunk.textDelta || "";
          }
          
          // Periodic updates for other users (not the initiator)
          if (Date.now() - lastUpdate > UPDATE_INTERVAL) {
            await ctx.runMutation(internal.messages.updateStreaming, {
              messageId: aiMessageId,
              content: accumulatedContent,
            });
            lastUpdate = Date.now();
          }
        },
        onFinish: async (result) => {
          // Final update - mark as complete
          await ctx.runMutation(internal.messages.updateStreaming, {
            messageId: aiMessageId,
            content: result.text,
            status: "complete",
          });
        },
      });

      const fullText = await result.text;
      return { messageId: aiMessageId, fullText };
    } catch (error) {
      console.error("Streaming agent response error:", error);
      await ctx.runMutation(internal.messages.updateStreaming, {
        messageId: aiMessageId,
        content: "Sorry, I encountered an error generating a response.",
        status: "error",
      });
      throw error;
    }
  },
});

// Generate AI response with agent (non-streaming version for background tasks)
export const generateAgentResponse = action({
  args: {
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    model: v.string(),
    userId: v.string(),
  },
  handler: async (
    ctx: ActionCtx,
    {
      conversationId,
      userMessage,
      model,
      userId,
    }: {
      conversationId: Id<"conversations">;
      userMessage: string;
      model: string;
      userId: string;
    }
  ): Promise<{ messageId: Id<"messages"> }> => {
    try {
      // Create agent with dynamic model and tools
      const agentWithModel = new Agent(components.agent, {
        chat: openRouterProvider(model),
        instructions: AI_PROMPTS.MAIN_INSTRUCTIONS,
        tools: {
          webSearch: webSearchTool,
          getCurrentTime: getCurrentTimeTool,
        },
        maxSteps: AGENT_CONFIG.MAIN_AGENT.maxSteps,
        maxRetries: AGENT_CONFIG.MAIN_AGENT.maxRetries,
        usageHandler: async (ctx, { userId, threadId, model, usage }) => {
          console.log(
            `Token usage - User: ${userId}, Thread: ${threadId}, Model: ${model}, Tokens: ${usage.totalTokens}`
          );
        },
      });

      let result;
      try {
        // Let Agent create and manage threads automatically
        result = await agentWithModel.generateText(ctx, { userId }, {
          prompt: userMessage,
        });
        
        // Log the agent result
        console.log("[generateAgentResponse] Agent result:", result.text);
      } catch (error) {
        // If tool calling fails, fallback to simple agent without tools
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          (error.name === "AI_APICallError" ||
            error.name === "AI_TypeValidationError")
        ) {
          console.log(
            "Tool calling failed, falling back to simple agent without tools"
          );
          const fallbackAgent = new Agent(components.agent, {
            chat: openRouterProvider(model),
            instructions: AI_PROMPTS.FALLBACK_INSTRUCTIONS,
            maxSteps: AGENT_CONFIG.FALLBACK_AGENT.maxSteps,
            maxRetries: AGENT_CONFIG.FALLBACK_AGENT.maxRetries,
          });
          result = await fallbackAgent.generateText(
            ctx,
            { userId },
            {
              prompt: userMessage,
            }
          );
          // Log the fallback agent result
          console.log("[generateAgentResponse] Fallback agent result:", result.text);
        } else {
          throw error;
        }
      }
      // Save AI response to your existing message system
      const messageId: Id<"messages"> = await ctx.runMutation(
        api.messages.send,
        {
          conversationId,
          userId: "ai-assistant", // Special AI user ID
          content: result.text,
          type: "ai",
          aiModel: model,
        }
      );
      return {
        messageId,
      };
    } catch (error) {
      console.error("Agent response generation error:", error);
      throw error;
    }
  },
});

// Generate conversation title using agent
export const generateAgentTitle = action({
  args: {
    conversationId: v.id("conversations"),
    firstMessage: v.string(),
  },
  handler: async (
    ctx: ActionCtx,
    {
      conversationId,
      firstMessage,
    }: {
      conversationId: Id<"conversations">;
      firstMessage: string;
    }
  ): Promise<string> => {
    try {
      // Use a simple approach for title generation without persistent threads
      const titleAgent = new Agent(components.agent, {
        chat: openRouterProvider(MODEL_CONFIG.TITLE_GENERATION),
        instructions: AI_PROMPTS.TITLE_GENERATION_INSTRUCTIONS,
        maxSteps: AGENT_CONFIG.TITLE_AGENT.maxSteps,
      });

      // Let the Agent manage threads automatically - use unique userId per title generation
      const result = await titleAgent.generateText(
        ctx,
        { userId: `title-gen-${conversationId}` },
        {
          prompt: AI_PROMPTS.TITLE_GENERATION_PROMPT(firstMessage),
        }
      );

      const cleanTitle = result.text.replace(/['"]/g, "").trim();

      // Log the generated title
      console.log("[generateAgentTitle] Generated title:", cleanTitle);

      // Update conversation title
      await ctx.runMutation(api.conversations.updateTitle, {
        conversationId,
        title: cleanTitle,
      });

      return cleanTitle;
    } catch (error) {
      console.error("Agent title generation error:", error);

      // Fallback to simple title generation
      const fallbackTitle =
        firstMessage.length > 30
          ? firstMessage.substring(0, 27) + "..."
          : firstMessage;

      await ctx.runMutation(api.conversations.updateTitle, {
        conversationId,
        title: fallbackTitle,
      });

      return fallbackTitle;
    }
  },
});

// Note: createConversationThread removed - Agent handles thread creation automatically
// Threads are created on-demand when first generateText() call is made

// Get available models (keep existing functionality)
export const getModels = action({
  args: {},
  handler: async (): Promise<AIModel[]> => {
    return getAIModelsArray();
  },
});

// Export agent for use in other parts of the application
export { aiAgent };
