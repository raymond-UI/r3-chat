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
  description: "Get the current date and time",
  args: z.object({}),
  handler: async (): Promise<string> => {
    return new Date().toISOString();
  },
});

// Create the main AI agent
const aiAgent = new Agent(components.agent, {
  // Chat completions model - using a more reliable model for tool calling
  chat: openRouterProvider("openai/gpt-4o-mini"),
  
  // Default instructions - more explicit about available tools
  instructions: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.

You have access to these tools when needed:
1. webSearch - use ONLY when the user asks for current/recent information, news, or real-time data that you wouldn't know
2. getCurrentTime - use ONLY when the user specifically asks for the current date or time

For most requests (creative writing, explanations, coding help, analysis, general knowledge, etc.), respond naturally without using any tools. Only use tools when the user's request specifically requires current information or time data that you cannot provide from your training.`,
  
  // Available tools
  tools: {
    webSearch: webSearchTool,
    getCurrentTime: getCurrentTimeTool,
  },
  
  // Enable multi-step tool use
  maxSteps: 5,
  maxRetries: 3,
  
  // Track token usage
  usageHandler: async (ctx, { userId, threadId, model, usage }) => {
    console.log(`Token usage - User: ${userId}, Thread: ${threadId}, Model: ${model}, Tokens: ${usage.totalTokens}`);
    // TODO: Store usage in database for billing/analytics
  },
});

// Stream AI response using Convex Agent (Convex-native streaming)
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
      // Create agent with dynamic model for streaming
      const streamingAgent = new Agent(components.agent, {
        chat: openRouterProvider(model),
        instructions: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.

You have access to these tools when needed:
1. webSearch - use ONLY when the user asks for current/recent information, news, or real-time data that you wouldn't know
2. getCurrentTime - use ONLY when the user specifically asks for the current date or time

For most requests (creative writing, explanations, coding help, analysis, general knowledge, etc.), respond naturally without using any tools. Only use tools when the user's request specifically requires current information or time data that you cannot provide from your training.`,
        tools: {
          webSearch: webSearchTool,
          getCurrentTime: getCurrentTimeTool,
        },
        maxSteps: 5,
        maxRetries: 3,
        usageHandler: async (ctx, { userId, threadId, model, usage }) => {
          console.log(`Token usage - User: ${userId}, Thread: ${threadId}, Model: ${model}, Tokens: ${usage.totalTokens}`);
        },
      });

      // Let the Agent manage threads automatically - no manual thread ID
      const result = await streamingAgent.generateText(ctx, { userId }, {
        prompt: userMessage,
      });

      // Save AI response to your existing message system
      await ctx.runMutation(
        api.messages.send,
        {
          conversationId,
          userId: "ai-assistant", // Special AI user ID
          content: result.text,
          type: "ai",
          aiModel: model,
        }
      );

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
      // Create agent with dynamic model
      const agentWithModel = new Agent(components.agent, {
        chat: openRouterProvider(model),
        instructions: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.

You have access to these tools when needed:
1. webSearch - use ONLY when the user asks for current/recent information, news, or real-time data that you wouldn't know
2. getCurrentTime - use ONLY when the user specifically asks for the current date or time

For most requests (creative writing, explanations, coding help, analysis, general knowledge, etc.), respond naturally without using any tools. Only use tools when the user's request specifically requires current information or time data that you cannot provide from your training.`,
        tools: {
          webSearch: webSearchTool,
          getCurrentTime: getCurrentTimeTool,
        },
        maxSteps: 5,
        maxRetries: 3,
        usageHandler: async (ctx, { userId, threadId, model, usage }) => {
          console.log(`Token usage - User: ${userId}, Thread: ${threadId}, Model: ${model}, Tokens: ${usage.totalTokens}`);
        },
      });

      // Let the Agent manage threads automatically - no manual thread ID
      let result;
      try {
        result = await agentWithModel.generateText(ctx, { userId }, {
          prompt: userMessage,
        });
      } catch (error) {
        // If tool calling fails, fallback to simple agent without tools
        if (error && typeof error === 'object' && 'name' in error && 
            (error.name === 'AI_APICallError' || error.name === 'AI_TypeValidationError')) {
          console.log("Tool calling failed, falling back to simple agent without tools");
          
          const fallbackAgent = new Agent(components.agent, {
            chat: openRouterProvider(model),
            instructions: `You are a helpful AI assistant in R3 Chat, a collaborative chat application. 
Be concise, friendly, and helpful. If the conversation involves multiple users, acknowledge the collaborative context appropriately.
Provide helpful responses based on your training data.`,
            maxSteps: 1,
            maxRetries: 2,
          });
          
          result = await fallbackAgent.generateText(ctx, { userId }, {
            prompt: userMessage,
          });
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
        chat: openRouterProvider("meta-llama/llama-3.1-8b-instruct:free"),
        instructions: "You are tasked with generating short, descriptive titles for chat conversations. Generate a concise title (2-6 words) that captures the main topic or intent of the message. Respond with only the title, no extra text or quotes.",
        maxSteps: 1, // No tools needed for title generation
      });

      // Let the Agent manage threads automatically - use unique userId per title generation
      const result = await titleAgent.generateText(ctx, { userId: `title-gen-${conversationId}` }, {
        prompt: `Generate a short title for this message: "${firstMessage}"`,
      });

      const cleanTitle = result.text.replace(/['"]/g, '').trim();
      
      // Update conversation title
      await ctx.runMutation(api.conversations.updateTitle, {
        conversationId,
        title: cleanTitle,
      });

      return cleanTitle;
    } catch (error) {
      console.error("Agent title generation error:", error);
      
      // Fallback to simple title generation
      const fallbackTitle = firstMessage.length > 30 
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