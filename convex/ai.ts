import { action } from "./_generated/server";
import { v } from "convex/values";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createTool, Agent } from "@convex-dev/agent";
import { components } from "./_generated/api";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { getAIModelsArray, type AIModel } from "@/types/ai";
import { env } from "@/env";
import { z } from "zod";
import { AI_PROMPTS, AGENT_CONFIG, MODEL_CONFIG } from "@/utils/prompts";

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

// Stream AI response using Convex Agent
export const streamAgentResponse = action({
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
  ): Promise<string> => {
    try {
      // Fetch conversation to get threadId
      const conversation = await ctx.runQuery(api.conversations.get, { conversationId });
      let threadId = conversation?.threadId;
      let thread;
      let streamingAgent;
      if (!threadId) {
        // Create agent with dynamic model for streaming
        streamingAgent = new Agent(components.agent, {
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
        // Create a new thread and store threadId
        const threadResult = await streamingAgent.createThread(ctx, { userId });
        threadId = threadResult.threadId;
        thread = threadResult.thread;
        // Patch conversation with threadId
        await ctx.runMutation(api.conversations.patchThreadId, { conversationId, threadId });
      } else {
        streamingAgent = new Agent(components.agent, {
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
        // Continue existing thread
        thread = (await streamingAgent.continueThread(ctx, { threadId })).thread;
      }
      // Generate text with context
      console.log("\n=== User Message ===");
      console.log("From:", userId);
      console.log("Content:", userMessage);
      console.log("Thread:", threadId);
      console.log("===================\n");
      const result = await thread.generateText({ prompt: userMessage });
      // Log the agent result
      console.log("[streamAgentResponse] Agent result:", result.text);
      // Save AI response to your existing message system
      await ctx.runMutation(api.messages.send, {
        conversationId,
        userId: "ai-assistant", // Special AI user ID
        content: result.text,
        type: "ai",
        aiModel: model,
      });
      return result.text;
    } catch (error) {
      console.error("Convex streaming agent generation error:", error);
      // Send error message
      await ctx.runMutation(api.messages.send, {
        conversationId,
        userId: "system",
        content: `Sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "system",
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
      // Fetch conversation to get threadId
      const conversation = await ctx.runQuery(api.conversations.get, { conversationId });
      let threadId = conversation?.threadId;
      let thread;
      let agentWithModel;
      if (!threadId) {
        agentWithModel = new Agent(components.agent, {
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
        // Create a new thread and store threadId
        const threadResult = await agentWithModel.createThread(ctx, { userId });
        threadId = threadResult.threadId;
        thread = threadResult.thread;
        await ctx.runMutation(api.conversations.patchThreadId, { conversationId, threadId });
      } else {
        agentWithModel = new Agent(components.agent, {
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
        // Continue existing thread
        thread = (await agentWithModel.continueThread(ctx, { threadId })).thread;
      }
      let result;
      try {
        result = await thread.generateText({ prompt: userMessage });
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
      console.error("Agent generation error:", error);
      // Send error message
      await ctx.runMutation(api.messages.send, {
        conversationId,
        userId: "system",
        content: `Sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "system",
      });
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

// Create a conversation thread (simplified - let Agent handle internally)
export const createConversationThread = action({
  args: {
    conversationId: v.id("conversations"),
    userId: v.string(),
  },
  handler: async (): Promise<{ success: boolean }> => {
    // Agent will create and manage threads automatically when first used
    // No need to manually create threads
    return { success: true };
  },
});

// Get available models (keep existing functionality)
export const getModels = action({
  args: {},
  handler: async (): Promise<AIModel[]> => {
    return getAIModelsArray();
  },
});

// Export agent for use in other parts of the application
export { aiAgent };
