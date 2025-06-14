import { useChat as useVercelChat } from "@ai-sdk/react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ModelLimitManager } from "@/utils/MessageLimitManager";

interface UseChatOptions {
  conversationId?: Id<"conversations">;
  initialMessages?: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model?: string;
  onFinish?: (message: { content: string }) => void;
}

// Enhanced message type that includes Convex metadata
interface EnhancedMessage {
  id: string;
  role: "user" | "assistant" | "system" | "data"; // Include "data" for AI SDK compatibility
  content: string;
  createdAt?: Date;
  // Convex-specific fields
  _id?: string; // Original Convex ID if available
  type?: "user" | "ai" | "system";
  timestamp?: number;
  branchIndex?: number;
  status?: string;
  aiModel?: string;
  userId?: string;
}

export function useChat({
  conversationId,
  initialMessages = [],
  model = "google/gemini-2.0-flash-exp:free",
  onFinish,
}: UseChatOptions = {}) {
  const { user } = useUser();
  const sendMessage = useMutation(api.messages.send);
  
  // Get messages from Convex if conversationId is provided
  const convexMessagesResult = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );
  
  const convexMessages = convexMessagesResult?.success ? convexMessagesResult.messages : null;

  // Transform Convex messages to enhanced AI SDK format
  const transformedMessages = useMemo(() => {
    if (!convexMessages) return initialMessages;

    return convexMessages.map((msg): EnhancedMessage => ({
      id: msg._id, // Use Convex ID as the AI SDK id
      role: msg.type === "ai" ? "assistant" as const : msg.type as "user" | "system",
      content: msg.content,
      createdAt: new Date(msg.timestamp),
      // Include Convex metadata
      _id: msg._id,
      type: msg.type,
      timestamp: msg.timestamp,
      branchIndex: msg.branchIndex,
      status: msg.status,
      aiModel: msg.aiModel,
      userId: msg.userId,
    }));
  }, [convexMessages, initialMessages]);

  // Use Vercel AI SDK's useChat hook
  const {
    messages: aiMessages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    isLoading,
    error,
    reload,
    stop,
    append,
    setMessages,
    setInput,
  } = useVercelChat({
    api: "/api/chat",
    initialMessages: transformedMessages,
    body: {
      model,
      conversationId,
      userId: user?.id || "anonymous",
    },
    onFinish: useCallback(
      async (message: { content: string }) => {
        // Save AI response to Convex when streaming completes
        if (conversationId) {
          await sendMessage({
            conversationId,
            userId: "ai-assistant",
            content: message.content,
            type: "ai",
            aiModel: model,
            status: "complete",
          });
        }
        onFinish?.(message);
      },
      [conversationId, sendMessage, model, onFinish]
    ),
  });

  // Enhance AI SDK messages with Convex metadata
  const messages = useMemo(() => {
    return aiMessages.map((msg): EnhancedMessage => {
      // If this message has Convex metadata (from our transformed messages), preserve it
      const convexData = transformedMessages.find(tm => tm.id === msg.id);
      if (convexData) {
        return {
          ...msg,
          ...convexData, // Include all Convex metadata
        };
      }
      
      // For new AI SDK messages, return as-is but mark them as non-Convex
      return {
        ...msg,
        _id: msg.id, // Use AI SDK id as fallback
      };
    });
  }, [aiMessages, transformedMessages]);

  // Custom submit handler that saves user message to Convex and tracks anonymous usage
  const handleSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>, chatRequestOptions?: { 
      data?: { 
        messages?: Array<{ content: string }>;
        fileIds?: Id<"files">[];
      } 
    }) => {
      if (!conversationId) {
        return originalHandleSubmit(e, chatRequestOptions);
      }

      // Save user message to Convex first
      const userMessage = chatRequestOptions?.data?.messages?.[0]?.content || input;
      const fileIds = chatRequestOptions?.data?.fileIds;
      const actualUserId = user?.id || "anonymous";
      
      if (userMessage?.trim()) {
        await sendMessage({
          conversationId,
          userId: actualUserId,
          content: userMessage.trim(),
          type: "user",
          fileIds, // Include file IDs if provided
        });

        // Track anonymous message if user is not signed in
        if (!user?.id) {
          ModelLimitManager.incrementAnonymousMessageCount();
          // Ensure conversation is tracked for anonymous user
          ModelLimitManager.addAnonymousConversation(conversationId);
        }
      }

      // Then proceed with AI SDK submission
      return originalHandleSubmit(e, chatRequestOptions);
    },
    [user?.id, conversationId, input, sendMessage, originalHandleSubmit]
  );

  // Enhanced submit function that accepts file IDs
  const submitWithFiles = useCallback(
    async (fileIds?: Id<"files">[]) => {
      return handleSubmit(undefined, {
        data: {
          messages: [{ content: input }],
          fileIds,
        },
      });
    },
    [handleSubmit, input]
  );

  // Sync messages when Convex data changes
  useEffect(() => {
    if (transformedMessages.length > 0 && aiMessages.length === 0) {
      setMessages(transformedMessages);
    }
  }, [transformedMessages, aiMessages.length, setMessages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    submitWithFiles, // New function for submitting with files
    isLoading,
    error,
    reload,
    stop,
    append,
    setMessages,
    setInput,
    // Additional utilities
    model,
  };
} 