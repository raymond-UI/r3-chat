import { action } from "./_generated/server";
import { v } from "convex/values";
import OpenAI from "openai";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { getAIModelsArray, type AIModel } from "@/types/ai";
import { env } from "@/env";

type Message = {
  _id: Id<"messages">;
  conversationId: Id<"conversations">;
  userId: string;
  content: string;
  type: "user" | "ai" | "system";
  aiModel?: string;
  timestamp: number;
};

type GenerateResponseReturn = {
  messageId: Id<"messages">;
  content: string;
  model: string;
};

// Generate AI response
export const generateResponse = action({
  args: {
    conversationId: v.id("conversations"),
    userMessage: v.string(),
    model: v.string(),
  },
  handler: async (
    ctx: ActionCtx,
    {
      conversationId,
      userMessage,
      model,
    }: {
      conversationId: Id<"conversations">;
      userMessage: string;
      model: string;
    }
  ): Promise<GenerateResponseReturn> => {
    // Get conversation history for context
    const messages: Message[] = await ctx.runQuery(api.messages.list, {
      conversationId,
    });

    // Initialize OpenAI client with OpenRouter
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": env.NEXT_PUBLIC_APP_URL,
        "X-Title": "R3 Chat",
      },
    });

    try {
      // Build conversation context (last 10 messages)
      const recentMessages: Array<{
        role: "user" | "assistant";
        content: string;
      }> = messages.slice(-10).map((msg: Message) => ({
        role: msg.type === "user" ? ("user" as const) : ("assistant" as const),
        content: msg.content,
      }));

      // Add current user message
      recentMessages.push({
        role: "user" as const,
        content: userMessage,
      });

      // Get AI response
      const completion: OpenAI.Chat.Completions.ChatCompletion =
        await client.chat.completions.create({
          model: model,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful AI assistant in a chat application. Be concise, friendly, and helpful. If the conversation is collaborative with multiple users, acknowledge that context appropriately.",
            },
            ...recentMessages,
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

      const aiResponse: string | null | undefined =
        completion.choices[0]?.message?.content;

      if (!aiResponse) {
        throw new Error("No response from AI");
      }

      // Save AI response to database
      const messageId: Id<"messages"> = await ctx.runMutation(
        api.messages.send,
        {
          conversationId,
          userId: "ai-assistant", // Special AI user ID
          content: aiResponse,
          type: "ai",
          aiModel: model,
        }
      );

      return {
        messageId,
        content: aiResponse,
        model,
      };
    } catch (error) {
      console.error("AI generation error:", error);

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

// Get available models
export const getModels = action({
  args: {},
  handler: async (): Promise<AIModel[]> => {
    return getAIModelsArray();
  },
});
