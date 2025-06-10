import { useAction, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AIModel } from "@/types/ai";
import { useUser } from "@clerk/nextjs";

export function useAI() {
  const { user } = useUser();
  const [selectedModel, setSelectedModel] = useState("meta-llama/llama-3.3-8b-instruct:free");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Use the new agent-based actions
  const generateAgentResponse = useAction(api.ai.generateAgentResponse);
  const generateAgentTitle = useAction(api.ai.generateAgentTitle);
  const createConversationThread = useAction(api.ai.createConversationThread);
  const getModels = useAction(api.ai.getModels);

  // Get conversation messages for context
  const useMessages = (conversationId: Id<"conversations">) => {
    return useQuery(api.messages.list, { conversationId });
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
    
    try {
      // Use Convex HTTP streaming endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/ai/stream`, {
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
          fullResponse += chunk;
          onChunk?.(chunk);
        }
      } finally {
        reader.releaseLock();
      }

      onComplete?.(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error("Convex HTTP streaming failed:", error);
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

  const initializeThread = async (
    conversationId: Id<"conversations">
  ) => {
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    try {
      return await createConversationThread({
        conversationId,
        userId: user.id,
      });
    } catch (error) {
      console.error("Thread initialization failed:", error);
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
    streamToAI,
    generateTitle,
    initializeThread,
    fetchModels,
    useMessages,
  };
} 