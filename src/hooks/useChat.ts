import { Message } from "ai/react";
import { useChat as useAIChat } from "@ai-sdk/react";
import { useMutation, useQuery, useAction } from "convex/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AIModel } from "@/types/ai";
import { getDefaultModel, getFallbackModel } from "@/lib/defaultModel";
import { getOrCreateAnonymousId } from "@/lib/utils";

interface UseChatOptions {
  conversationId?: Id<"conversations">;
  initialMessages?: Message[];
  model?: string;
  onFinish?: (message: Message) => void;
}

interface EnhancedMessage extends Message {
  type?: "user" | "ai" | "system";
  userId?: string;
}

export function useChat({
  conversationId,
  initialMessages = [],
  model,
  onFinish,
}: UseChatOptions = {}) {
  const { user } = useUser();

  // Get user configuration for dynamic defaults
  const configuration = useQuery(
    api.userApiKeys.getMyConfiguration, 
    user ? {} : "skip"
  );

  // State management with dynamic default
  const [selectedModel, setSelectedModel] = useState(() => {
    if (model) return model;
    
    // Use fallback until configuration loads
    return getFallbackModel("chat");
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Convex mutations and queries
  const sendMessage = useMutation(api.messages.send);
  const generateAgentTitle = useAction(api.ai.generateAgentTitle);
  const getModels = useAction(api.ai.getModels);

  // Get messages from Convex if conversationId is provided
  const convexMessagesResult = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );

  const convexMessages = convexMessagesResult?.success
    ? convexMessagesResult.messages
    : null;

  // Transform Convex messages to enhanced AI SDK format
  const transformedMessages = useMemo(() => {
    if (!convexMessages) return initialMessages;

    return convexMessages.map(
      (msg): EnhancedMessage => ({
        id: msg._id, // Use Convex ID as the AI SDK id
        role:
          msg.type === "ai"
            ? ("assistant" as const)
            : (msg.type as "user" | "system"),
        content: msg.content,
        createdAt: new Date(msg.timestamp),
        // Additional fields for enhanced message
        type: msg.type,
        userId: msg.userId,
      })
    );
  }, [convexMessages, initialMessages]);

  // Use Vercel AI SDK's useChat hook for streaming
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    error,
    reload,
    status,
    stop,
    append,
    setMessages,
    setInput,
  } = useAIChat({
    api: "/api/chat",
    // Use a function to get the current body with updated selectedModel
    body: () => ({
      conversationId,
      model: selectedModel, // This will always use the current selectedModel
      userId: user?.id, // Pass user ID for BYOK
    }),
    initialMessages: transformedMessages,
    onFinish: async (message) => {
      // Save AI message to Convex after completion
      if (conversationId && message.role === "assistant") {
        try {
          await sendMessage({
            conversationId,
            userId: "ai-assistant",
            senderName: "Assistant",
            content: message.content,
            type: "ai",
            aiModel: selectedModel,
          });
        } catch (error) {
          console.error("Failed to save AI message to Convex:", error);
        }
      }
      onFinish?.(message);
    },
  });

  // Enhanced submit function that accepts file IDs and saves user message to Convex
  const submitWithFiles = useCallback(
    async (fileIds?: Id<"files">[]) => {
      if (!conversationId) return; // Only check for conversationId, not user
  
      const messageContent = input.trim();
      if (!messageContent && (!fileIds || fileIds.length === 0)) return;
  
      // Generate anonymous user ID if no authenticated user
      const userId = user?.id || getOrCreateAnonymousId();
      const senderName = user?.firstName || user?.username || "Anonymous User";
  
      // Debug logging - log selected model and available API keys
      console.log("🔍 [CLIENT] Message submission debug:", {
        selectedModel,
        hasConfiguration: !!configuration,
        apiKeysAvailable: configuration?.apiKeys ? Object.keys(configuration.apiKeys).filter(key => 
          configuration.apiKeys?.[key as keyof typeof configuration.apiKeys]
        ) : [],
        userPreferences: configuration?.preferences,
        conversationId,
        userId,
        isAnonymous: !user?.id,
      });
  
      try {
        // First, save user message to Convex
        await sendMessage({
          conversationId,
          userId,
          senderName,
          content: messageContent,
          type: "user",
          fileIds: fileIds || [],
        });
  
        // Wait a bit for Convex to update the message list
        await new Promise(resolve => setTimeout(resolve, 100));
  
        // Then submit to AI with file IDs
        return handleSubmit(undefined, {
          body: {
            fileIds: fileIds || [],
            conversationId,
            model: selectedModel,
            userId: userId, // Pass user ID (anonymous or authenticated) for BYOK
          },
        });
      } catch (error) {
        console.error("Failed to submit message with files:", error);
        throw error;
      }
    },
    [handleSubmit, input, conversationId, selectedModel, user?.id, user?.firstName, user?.username, sendMessage, configuration]
  );


  // Enhanced submit function that saves user message to Convex first
  const enhancedHandleSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>) => {
      if (!conversationId) return; // Only check for conversationId, not user
  
      const messageContent = input.trim();
      if (!messageContent) return;
  
      // Generate anonymous user ID if no authenticated user
      const userId = user?.id || getOrCreateAnonymousId();
      const senderName = user?.firstName || user?.username || "Anonymous User";
  
      // Debug logging - log selected model and available API keys
      console.log("🔍 [CLIENT] Enhanced submit debug:", {
        selectedModel,
        hasConfiguration: !!configuration,
        apiKeysAvailable: configuration?.apiKeys ? Object.keys(configuration.apiKeys).filter(key => 
          configuration.apiKeys?.[key as keyof typeof configuration.apiKeys]
        ) : [],
        userPreferences: configuration?.preferences,
        conversationId,
        userId,
        isAnonymous: !user?.id,
      });
  
      try {
        // First, save user message to Convex
        await sendMessage({
          conversationId,
          userId,
          senderName,
          content: messageContent,
          type: "user",
        });
  
        // Wait a bit for Convex to update the message list
        await new Promise(resolve => setTimeout(resolve, 100));
  
        // Then submit to AI with the current input
        return handleSubmit(e, {
          body: {
            conversationId,
            model: selectedModel,
            userId: userId, // Pass user ID (anonymous or authenticated) for BYOK
          },
        });
      } catch (error) {
        console.error("Failed to submit message:", error);
        throw error;
      }
    },
    [handleSubmit, input, conversationId, selectedModel, user?.id, user?.firstName, user?.username, sendMessage, configuration]
  );
  

  // Generate conversation title (works for both logged-in and anonymous users)
  const generateTitle = useCallback(
    async (conversationId: Id<"conversations">, firstMessage: string) => {
      setIsGenerating(true);
      try {
        await generateAgentTitle({
          conversationId,
          firstMessage,
        });
      } catch (error) {
        console.error("Failed to generate title:", error);
      } finally {
        setIsGenerating(false);
      }
    },
    [generateAgentTitle]
  );

  // Fetch available AI models
  const fetchModels = useCallback(async (): Promise<AIModel[]> => {
    try {
      const models = await getModels({});
      return models || [];
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  }, [getModels]);

  // Update selected model when configuration changes or model prop changes
  useEffect(() => {
    if (model) {
      setSelectedModel(model);
    } else if (configuration) {
      const dynamicDefault = getDefaultModel(
        configuration.apiKeys || null,
        configuration.preferences || null,
        "chat"
      );
      setSelectedModel(dynamicDefault);
    }
  }, [model, configuration]);

  // Sync messages when Convex data changes - with deduplication
  const [lastSyncedMessageCount, setLastSyncedMessageCount] = useState(0);
  
  useEffect(() => {
    if (transformedMessages.length > 0 && transformedMessages.length !== lastSyncedMessageCount) {
      // Only sync when message count changes to prevent duplicate triggers
      setMessages(transformedMessages);
      setLastSyncedMessageCount(transformedMessages.length);
    }
  }, [transformedMessages, setMessages, lastSyncedMessageCount]);

  return {
    // AI SDK chat functionality
    messages,
    input,
    handleInputChange,
    handleSubmit: enhancedHandleSubmit, // Enhanced version that saves to Convex
    submitWithFiles, // Enhanced function for submitting with files
    isLoading: status === "streaming" || isGenerating,
    error,
    reload,
    stop,
    append,
    setMessages,
    setInput,

    // Model management
    selectedModel,
    setSelectedModel,
    fetchModels,

    // Utilities
    generateTitle,
    isGenerating,

    // Direct message sending
    send: async (
      conversationId: Id<"conversations">,
      content: string,
      type: "user" | "ai" | "system" = "user",
      aiModel?: string,
      fileIds?: Id<"files">[]
    ) => {
      const userId = user?.id || getOrCreateAnonymousId();
      const senderName = user?.firstName || user?.username || "Anonymous User";
      
      // Debug logging - log the model being used in send function
      console.log("🔍 [CLIENT] useChat send function debug:", {
        aiModel,
        selectedModel,
        type,
        conversationId,
        userId,
      });
      
      // Update selectedModel if a different aiModel is specified
      if (aiModel && aiModel !== selectedModel) {
        console.log("🔍 [CLIENT] Updating selectedModel from send function:", {
          oldModel: selectedModel,
          newModel: aiModel,
        });
        setSelectedModel(aiModel);
      }
      
      return await sendMessage({
        conversationId,
        userId,
        senderName,
        content,
        type,
        aiModel,
        fileIds,
      });
    },

    // Convex integration
    convexMessages,

    // Backward compatibility (deprecated - use submitWithFiles instead)
    streamToAI: submitWithFiles, // Alias for backward compatibility
  };
}
