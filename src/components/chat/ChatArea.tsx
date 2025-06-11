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
import { AiIndicator } from "../indicators/AiIndicator";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  aiEnabled: boolean;
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
  // 🆕 Track streaming content for active user only (real-time streaming)
  const [activeStreamingContent, setActiveStreamingContent] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { user } = useUser();

  // 🆕 Enhanced message display with proper status from database
  const displayMessages = messages.map(message => {
    // Show real-time streaming content for the user who initiated the stream
    if (message.status === "streaming" && message.streamingForUser === user?.id) {
      // Use a simple key that matches any active streaming
      const streamingContent = activeStreamingContent["active-stream"];
      
      return {
        ...message,
        content: streamingContent || message.content,
        isRealTimeStreaming: Boolean(streamingContent),
      };
    }
    return {
      ...message,
      isRealTimeStreaming: false,
    };
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "end" });
  }, [displayMessages]);

  const handleSendMessage = useCallback(async () => {
    if (!user?.id || (!inputValue.trim() && !hasFilesToSend)) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      // Send user message with uploaded file IDs
      const userMessage = await send(
        conversationId,
        messageContent,
        "user",
        undefined,
        uploadedFileIds.length > 0 ? uploadedFileIds : undefined
      );

      // Clear uploaded files after message is sent
      clearUploadedFiles();
      await stopTyping();

      // 🆕 Real streaming with multi-user coordination
      if (aiEnabled && messageContent && userMessage) {
        try {
          await streamToAI(
            conversationId,
            messageContent,
            selectedModel,
            // Real-time chunks for active user
            (chunk: string) => {
              setActiveStreamingContent(prev => ({
                ...prev,
                "active-stream": (prev["active-stream"] || "") + chunk
              }));
            },
            // Complete handler
            () => {
              console.log("✅ Streaming complete");
              // Clear all streaming content - database message should now be complete
              setActiveStreamingContent({});
            }
          );
        } catch (error) {
          console.error("Streaming error:", error);
          setActiveStreamingContent({});
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      // Re-add message to input on error
      setInputValue(messageContent);
      // Clear any streaming content
      setActiveStreamingContent({});
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
        <MessageList messages={displayMessages} />

        {/* 🆕 Multi-user streaming indicators based on database status */}
        {messages.some(m => m.status === "streaming" && m.streamingForUser !== user?.id) && (
          <div className="mt-4 -translate-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-3 h-3  bg-current rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-current rounded-full animate-bounce delay-100"></div>
                <div className="w-3 h-3 bg-current rounded-full animate-bounce delay-200"></div>
              </div>
              <span>Assistant...</span>
            </div>
          </div>
        )}

        {/* 🆕 Enhanced streaming indicators */}
        {isStreaming && (
          <div className="mt-4">
            <AiIndicator />
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
