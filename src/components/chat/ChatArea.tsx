"use client";

import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useAI } from "@/hooks/useAI";
import { useFiles } from "@/hooks/useFiles";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  aiEnabled: boolean;
}

// Optimistic message type for streaming
interface OptimisticMessage {
  _id: string;
  conversationId: Id<"conversations">;
  userId: string;
  content: string;
  type: "user" | "ai" | "system";
  timestamp: number;
  aiModel?: string;
  attachments?: Array<{
    file_name: string;
    file_type: string;
    file_size: number;
    file_url: string;
    extracted_content?: string;
  }>;
  isOptimistic?: boolean;
  isStreaming?: boolean;
}

export function ChatArea({ conversationId, aiEnabled }: ChatAreaProps) {
  const { messages, isLoading } = useMessages(conversationId);
  const { send } = useSendMessage();
  const { typingUsers, setTyping, stopTyping } = usePresence(conversationId);
  const { selectedModel, setSelectedModel, isStreaming, streamToAI } = useAI();
  const {
    // files,
    uploadingFiles,
    uploadedFileIds,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    removeFile,
    clearUploadedFiles,
  } = useFiles(conversationId);

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  // Optimistic messages for real-time streaming
  const [optimisticMessages, setOptimisticMessages] = useState<OptimisticMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();

  // Combine real and optimistic messages
  const allMessages = [
    ...messages.map(m => ({ ...m, isOptimistic: false as const })),
    ...optimisticMessages
  ].sort((a, b) => a.timestamp - b.timestamp);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!user?.id || (!inputValue.trim() && !hasFilesToSend)) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      // Send user message with uploaded file IDs
      await send(
        conversationId,
        messageContent,
        "user",
        undefined,
        uploadedFileIds.length > 0 ? uploadedFileIds : undefined
      );

      // Clear uploaded files after message is sent
      clearUploadedFiles();
      await stopTyping();

      // Generate AI response if enabled with optimistic updates
      if (aiEnabled && messageContent) {
        // Create optimistic AI message that will be updated in real-time
        const optimisticAIMessage: OptimisticMessage = {
          _id: `optimistic-ai-${Date.now()}`,
          conversationId,
          userId: "ai-assistant",
          content: "",
          type: "ai",
          timestamp: Date.now(),
          aiModel: selectedModel,
          isOptimistic: true,
          isStreaming: true,
        };

        // Add optimistic message to state
        setOptimisticMessages(prev => [...prev, optimisticAIMessage]);

        await streamToAI(
          conversationId,
          messageContent,
          selectedModel,
          // Real-time chunk handler - updates optimistic message
          (chunk: string) => {
            setOptimisticMessages(prev => 
              prev.map(msg => 
                msg._id === optimisticAIMessage._id 
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          },
          // Complete handler - marks streaming as done
          (fullResponse: string) => {
            setOptimisticMessages(prev => 
              prev.map(msg => 
                msg._id === optimisticAIMessage._id 
                  ? { ...msg, content: fullResponse, isStreaming: false }
                  : msg
              )
            );
            
            // Remove optimistic message after a delay to let real message appear
            setTimeout(() => {
              setOptimisticMessages(prev => 
                prev.filter(msg => msg._id !== optimisticAIMessage._id)
              );
            }, 1000);
          }
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Re-add message to input on error
      setInputValue(messageContent);
      // Clear any optimistic messages
      setOptimisticMessages([]);
    } finally {
      setIsSending(false);
    }
  }, [
    user?.id,
    inputValue,
    hasFilesToSend,
    uploadedFileIds,
    send,
    conversationId,
    clearUploadedFiles,
    stopTyping,
    aiEnabled,
    streamToAI,
    selectedModel,
  ]);

  const handleInputChange = async (value: string) => {
    setInputValue(value);

    // Handle typing indicators
    if (value.length > 0) {
      await setTyping(true);
    } else {
      await stopTyping();
    }
  };

  // Debounced typing clear
  useEffect(() => {
    if (inputValue.length === 0) return;

    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000); // Stop typing after 3 seconds of inactivity

    return () => clearTimeout(timeout);
  }, [inputValue, stopTyping]);

  if (isLoading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading conversation...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full relative mx-auto overflow-y-auto">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 w-full sm:pt-6 max-w-3xl mx-auto">
        <MessageList messages={allMessages} />

        {/* AI Generating Indicator */}
        {isStreaming && !optimisticMessages.length && (
          <div className="mt-4 -translate-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-3 h-3  bg-current rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-current rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-current rounded-full animate-bounce delay-200"></div>
              </div>
              <span>AI is thinking...</span>
            </div>
          </div>
        )}

        {/* Typing Indicators */}
        {typingUsers.length > 0 && (
          <div className="mt-4">
            <TypingIndicator users={typingUsers} />
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-secondary/60 backdrop-blur shadow-2xl p-2 pb-0 w-full rounded-t-lg max-w-3xl mx-auto">
        <MessageInput
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          disabled={isSending || isStreaming}
          placeholder={
            isStreaming ? "AI is responding..." : "Type a message..."
          }
          uploadingFiles={uploadingFiles}
          onUploadFiles={uploadFiles}
          onRemoveFile={removeFile}
          isUploading={isUploading}
          hasFilesToSend={hasFilesToSend}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      </div>
    </div>
  );
}
