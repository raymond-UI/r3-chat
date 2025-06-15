"use client";
import { useAction, useQuery, useMutation } from "convex/react";
import { useState, useCallback, useEffect, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { AIModel } from "@/types/ai";
import { useUser } from "@clerk/nextjs";
import { env } from "@/env";

interface UseChatOptions {
  conversationId?: Id<"conversations">;
  initialMessages?: Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  model?: string;
  onFinish?: (message: { content: string }) => void;
  onChunk?: (chunk: string) => void;
}

// Enhanced message type that includes Convex metadata
interface EnhancedMessage {
  id: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
  createdAt?: Date;
  // Convex-specific fields
  _id?: string;
  type?: "user" | "ai" | "system";
  timestamp?: number;
  branchIndex?: number;
  status?: string;
  aiModel?: string;
  userId?: string;
}

// Fixed result type interfaces
interface StreamResult {
  fullResponse: string;
  messageId?: string;
  content?: string;
}

interface SendResult {
  messageId: Id<"messages">;
  content: string;
  fullText?: string;
}

export function useChat({
  conversationId,
  initialMessages = [],
  model = "google/gemini-2.0-flash-exp:free",
  onFinish,
  onChunk,
}: UseChatOptions = {}) {
  const { user } = useUser();
  
  // State management combining both approaches
  const [selectedModel, setSelectedModel] = useState(model);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<EnhancedMessage[]>(initialMessages);
  const [error, setError] = useState<string | null>(null);

  // Convex actions and mutations
  const generateAgentResponse = useAction(api.ai.generateAgentResponse);
  const streamAgentResponse = useAction(api.ai.streamAgentResponse);
  const generateAgentTitle = useAction(api.ai.generateAgentTitle);
  const getModels = useAction(api.ai.getModels);
  const sendMessage = useMutation(api.messages.send);

  // Get conversation messages for context
  const convexMessagesResult = useQuery(
    api.messages.list,
    conversationId ? { conversationId } : "skip"
  );
  
  const convexMessages = convexMessagesResult?.success ? convexMessagesResult.messages : null;

  // Transform Convex messages to enhanced format
  const transformedMessages = useMemo(() => {
    if (!convexMessages) return initialMessages;

    return convexMessages.map((msg): EnhancedMessage => ({
      id: msg._id,
      role: msg.type === "ai" ? "assistant" as const : msg.type as "user" | "system",
      content: msg.content,
      createdAt: new Date(msg.timestamp),
      _id: msg._id,
      type: msg.type,
      timestamp: msg.timestamp,
      branchIndex: msg.branchIndex,
      status: msg.status,
      aiModel: msg.aiModel,
      userId: msg.userId,
    }));
  }, [convexMessages, initialMessages]);

  // Sync messages when Convex data changes
  useEffect(() => {
    if (transformedMessages.length > 0) {
      setMessages(transformedMessages);
    }
  }, [transformedMessages]);

  // Helper function for anonymous conversation tracking
  const addAnonymousConversation = useCallback((conversationId: string) => {
    if (typeof window === "undefined") return;
    const conversations = localStorage.getItem("anonymous_conversations");
    const existingConversations = conversations ? JSON.parse(conversations) : [];
    if (!existingConversations.includes(conversationId)) {
      existingConversations.push(conversationId);
      localStorage.setItem("anonymous_conversations", JSON.stringify(existingConversations));
    }
  }, []);

  // HTTP endpoint streaming (primary method)
  const streamViaHTTP = useCallback(async (
    userMessage: string,
    targetModel: string
  ): Promise<StreamResult> => {
    const response = await fetch(`${env.NEXT_PUBLIC_CONVEX_SITE_URL}/ai/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        userMessage,
        model: targetModel,
        userId: user?.id || "anonymous",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const messageId = response.headers.get("X-Message-Id");
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
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const textContent = JSON.parse(line.slice(2));
              fullResponse += textContent;
              onChunk?.(textContent);
              
              // Update messages in real-time
              setMessages(prev => {
                const lastMessage = prev[prev.length - 1];
                if (lastMessage && lastMessage.role === "assistant") {
                  return prev.slice(0, -1).concat({
                    ...lastMessage,
                    content: lastMessage.content + textContent,
                  });
                } else {
                  return prev.concat({
                    id: messageId || `ai-${Date.now()}`,
                    role: "assistant",
                    content: textContent,
                    createdAt: new Date(),
                    type: "ai",
                    aiModel: targetModel,
                    status: "streaming",
                  });
                }
              });
            } catch {
              console.warn("Failed to parse chunk:", line);
            }
          } else if (line.startsWith('3:')) {
            try {
              const errorMsg = JSON.parse(line.slice(2));
              throw new Error(errorMsg);
            } catch {
              throw new Error("Stream error occurred");
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return { 
      fullResponse, 
      messageId: messageId || undefined,
      content: fullResponse
    };
  }, [conversationId, user?.id, onChunk]);

  // Convex direct action streaming (fallback method)
  const streamViaConvexAction = useCallback(async (
    userMessage: string,
    targetModel: string
  ): Promise<StreamResult> => {
    const result = await streamAgentResponse({
      conversationId: conversationId!,
      userMessage,
      model: targetModel,
      userId: user?.id || "anonymous",
    });
    
    return { 
      fullResponse: result.fullText || "", 
      messageId: result.messageId,
      content: result.fullText || ""
    };
  }, [conversationId, user?.id, streamAgentResponse]);

  // Unified streaming with automatic fallback
  const streamToAI = useCallback(async (
    userMessage: string,
    targetModel?: string
  ): Promise<StreamResult> => {
    if (!conversationId) {
      throw new Error("Conversation ID required for streaming");
    }

    const modelToUse = targetModel || selectedModel;
    setIsStreaming(true);
    setError(null);
    
    console.log("\n=== Unified Streaming ===");
    console.log("User:", user?.id || "anonymous");
    console.log("Message:", userMessage);
    console.log("Model:", modelToUse);
    console.log("Conversation:", conversationId);
    console.log("========================\n");
    
    try {
      // Try HTTP endpoint first
      return await streamViaHTTP(userMessage, modelToUse);
    } catch (httpError) {
      console.warn('HTTP streaming failed, falling back to Convex action:', httpError);
      try {
        // Fallback to Convex direct action
        return await streamViaConvexAction(userMessage, modelToUse);
      } catch (convexError) {
        console.error('Both streaming methods failed:', { httpError, convexError });
        throw new Error('Streaming failed on all methods');
      }
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, selectedModel, user?.id, streamViaHTTP, streamViaConvexAction]);

  // Non-streaming fallback (sendToAI from original useAI)
  const sendToAI = useCallback(async (
    userMessage: string,
    targetModel?: string
  ): Promise<SendResult> => {
    if (!user?.id && !conversationId) {
      throw new Error("User not authenticated or conversation ID missing");
    }

    const modelToUse = targetModel || selectedModel;
    setIsGenerating(true);
    setError(null);
    
    try {
      const result = await generateAgentResponse({
        conversationId: conversationId!,
        userMessage,
        model: modelToUse,
        userId: user?.id || "anonymous",
      });
      
      return {
        messageId: result.messageId,
        content: "",
      };
    } catch (error) {
      console.error("AI generation failed:", error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [conversationId, user?.id, selectedModel, generateAgentResponse]);

  // Enhanced submit handler
  const handleSubmit = useCallback(
    async (e?: React.FormEvent<HTMLFormElement>, options?: { 
      fileIds?: Id<"files">[];
      useStreaming?: boolean;
    }) => {
      e?.preventDefault();
      
      if (!conversationId || !input.trim()) return;

      const userMessage = input.trim();
      const actualUserId = user?.id || "anonymous";
      const useStreaming = options?.useStreaming !== false; // Default to streaming

      try {
        // Save user message to Convex first (rate limiting handled server-side)
        await sendMessage({
          conversationId,
          userId: actualUserId,
          content: userMessage,
          type: "user",
          fileIds: options?.fileIds,
        });

        // Track anonymous conversation for migration (not message count)
        if (!user?.id) {
          addAnonymousConversation(conversationId);
        }

        // Add user message to local state immediately
        const userMsg: EnhancedMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: userMessage,
          createdAt: new Date(),
          type: "user",
          userId: actualUserId,
        };
        setMessages(prev => [...prev, userMsg]);
        setInput("");

        // Stream or send AI response
        let result: StreamResult | SendResult;
        if (useStreaming) {
          result = await streamToAI(userMessage);
          
          // Update final message status
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              return prev.slice(0, -1).concat({
                ...lastMessage,
                status: "complete",
                content: 'fullResponse' in result ? result.fullResponse : result.content,
              });
            }
            return prev;
          });
        } else {
          result = await sendToAI(userMessage);
          
          // Add AI response to messages
          const aiMsg: EnhancedMessage = {
            id: result.messageId || `ai-${Date.now()}`,
            role: "assistant",
            content: result.content || "",
            createdAt: new Date(),
            type: "ai",
            aiModel: selectedModel,
            status: "complete",
          };
          setMessages(prev => [...prev, aiMsg]);
        }

        const finalContent = 'fullResponse' in result ? result.fullResponse : result.content;
        onFinish?.({ content: finalContent || "" });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("Submit failed:", err);
      }
    },
    [conversationId, input, user?.id, sendMessage, addAnonymousConversation, streamToAI, sendToAI, selectedModel, onFinish]
  );

  // Enhanced submit with files
  const submitWithFiles = useCallback(
    async (fileIds?: Id<"files">[], useStreaming = true) => {
      return handleSubmit(undefined, { fileIds, useStreaming });
    },
    [handleSubmit]
  );

  // Input change handler
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // Generate title (from original useAI)
  const generateTitle = async (firstMessage: string) => {
    if (!conversationId) return;
    
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

  // Fetch models (from original useAI)
  const fetchModels = async (): Promise<AIModel[]> => {
    try {
      return await getModels();
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return [];
    }
  };

  // Loading state combines both streaming and generating
  const isLoading = isStreaming || isGenerating;

  return {
    // Message management
    messages,
    setMessages,
    
    // Input management
    input,
    setInput,
    handleInputChange,
    
    // Submission
    handleSubmit,
    submitWithFiles,
    
    // AI functionality
    sendToAI,
    streamToAI,
    generateTitle,
    
    // Model management
    selectedModel,
    setSelectedModel,
    fetchModels,
    
    // State
    isLoading,
    isGenerating,
    isStreaming,
    error,
    
    // Legacy compatibility
    model: selectedModel,
  };
}