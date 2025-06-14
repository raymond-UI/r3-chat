import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AIModel } from "@/types/ai";
import { useUser } from "@clerk/nextjs";
import { env } from "@/env";

export function useAI() {
  const { user } = useUser();
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-exp:free");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // 🆕 Use both streaming and non-streaming agent actions
  const generateAgentResponse = useAction(api.ai.generateAgentResponse);
  const streamAgentResponse = useAction(api.ai.streamAgentResponse);
  const generateAgentTitle = useAction(api.ai.generateAgentTitle);
  const getModels = useAction(api.ai.getModels);

  // Get conversation messages for context
  const useMessages = (conversationId: Id<"conversations">) => {
    const queryResult = useQuery(api.messages.list, { conversationId });
    return queryResult?.success ? queryResult.messages : [];
  };

  const sendToAI = async (
    conversationId: Id<"conversations">,
    userMessage: string,
    model?: string
  ) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    setIsGenerating(true);
    
    // Log prompt and context sent from frontend
    console.log("\n=== Sending Message to AI ===");
    console.log("User:", user.id);
    console.log("Message:", userMessage);
    console.log("Model:", model || selectedModel);
    console.log("Conversation:", conversationId);
    console.log("===========================\n");
    
    try {
      const result = await generateAgentResponse({
        conversationId,
        userMessage,
        model: model || selectedModel,
        userId: user.id,
      });
      
      return result;
    } catch (error) {
      console.error("AI generation failed:", error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  // 🆕 Enhanced streaming with real AI SDK + background multi-user coordination
  const streamToAI = async (
    conversationId: Id<"conversations">,
    userMessage: string,
    model?: string,
    onChunk?: (chunk: string) => void,
    onComplete?: (fullResponse: string) => void
  ) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    setIsStreaming(true);
    
    // Log prompt and context sent from frontend
    console.log("[useAI] streamToAI called", {
      conversationId,
      prompt: userMessage,
      model: model || selectedModel,
      userId: user.id,
    });
    
    try {
      // 🆕 Use real AI SDK streaming via Convex HTTP endpoint
      // This provides instant streaming for active user + background coordination for others
      const response = await fetch(`${env.NEXT_PUBLIC_CONVEX_SITE_URL}/ai/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId,
          userMessage,
          model: model || selectedModel,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // 🆕 Extract message ID from response header
      const messageId = response.headers.get("X-Message-Id");
      console.log("🆔 Streaming message ID:", messageId);

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body reader available");
      }

      const decoder = new TextDecoder();
      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          
          // 🔧 Parse AI SDK data stream format
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('0:')) {
              // Text chunk format: 0:"chunk content"
              try {
                const textContent = JSON.parse(line.slice(2));
                console.log("🔥 Parsed chunk:", textContent);
                fullResponse += textContent;
                onChunk?.(textContent);
              } catch {
                console.warn("Failed to parse chunk:", line);
              }
            } else if (line.startsWith('3:')) {
              // Error chunk format: 3:"error message"
              try {
                const errorMsg = JSON.parse(line.slice(2));
                console.error("🛑 AI stream error:", errorMsg);
                // Propagate error via onChunk/onComplete as appropriate
                onChunk?.(`Error: ${errorMsg}`);
                onComplete?.(`Error: ${errorMsg}`);
                // Abort further processing
                return { fullResponse: `Error: ${errorMsg}`, messageId };
              } catch {
                console.error("Failed to parse error chunk", line);
                return { fullResponse: "Error", messageId };
              }
            } else if (line.startsWith('d:')) {
              // Done signal - usually the last line
              console.log("🏁 Stream complete");
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      onComplete?.(fullResponse);
      return { fullResponse, messageId };
    } catch (error) {
      console.error("Convex HTTP streaming failed:", error);
      throw error;
    } finally {
      setIsStreaming(false);
    }
  };

  // 🆕 Alternative: Direct streaming action (for cases where HTTP endpoint is not preferred)
  const streamToAIDirect = async (
    conversationId: Id<"conversations">,
    userMessage: string,
    model?: string
  ) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    setIsStreaming(true);
    
    try {
      const result = await streamAgentResponse({
        conversationId,
        userMessage,
        model: model || selectedModel,
        userId: user.id,
      });
      
      return result;
    } catch (error) {
      console.error("Direct streaming failed:", error);
      throw error;
    } finally {
      setIsStreaming(false);
    }
  };

  const generateTitle = async (
    conversationId: Id<"conversations">,
    firstMessage: string
  ) => {
    try {
      return await generateAgentTitle({
        conversationId,
        firstMessage,
      });
    } catch (error) {
      console.error("Title generation failed:", error);
      throw error;
    }
  };

  const fetchModels = async (): Promise<AIModel[]> => {
    try {
      return await getModels();
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  };

  return {
    selectedModel,
    setSelectedModel,
    isGenerating,
    isStreaming,
    sendToAI,
    streamToAI, // Real-time streaming for active user
    streamToAIDirect, // 🆕 Direct action streaming alternative
    generateTitle,
    fetchModels,
    useMessages,
  };
} 