"use client";

import { MessageInput } from "@/components/chat/MessageInput";
import { useChat } from "@/hooks/useChat";
import { useFiles } from "@/hooks/useFiles";
import { usePresence } from "@/hooks/usePresence";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { ChatScrollManager } from "./ChatScrollManager";
import { useChatMessages } from "@/hooks/messages/useChatMessages";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  aiEnabled: boolean;
}

export function ChatArea({ conversationId, aiEnabled }: ChatAreaProps) {
  const { user } = useUser();
  const { typingUsers, setTyping, stopTyping } = usePresence(conversationId);
  
  // File upload functionality
  const {
    uploadingFiles,
    uploadedFileIds,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    removeFile,
    clearUploadedFiles,
  } = useFiles(conversationId);

  // AI SDK integration
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const {
    messages: aiMessages,
    input,
    handleInputChange: aiHandleInputChange,
    handleSubmit: aiHandleSubmit,
    submitWithFiles,
    isLoading: aiIsLoading,
    error: aiError,
    reload,
    stop,
  } = useChat({
    conversationId,
    model: selectedModel,
  });

  // Local state for UI management
  const [isSending, setIsSending] = useState(false);
  const [hasTriggeredInitialResponse, setHasTriggeredInitialResponse] = useState(false);

  // Transform AI messages to display format
  const displayMessages = useChatMessages({
    aiMessages,
    conversationId,
    user,
    aiIsLoading,
  });

  // Auto-trigger AI response for new conversations
  useEffect(() => {
    if (
      aiEnabled &&
      displayMessages.length === 1 &&
      displayMessages[0]?.type === "user" &&
      !aiIsLoading &&
      !isSending &&
      !hasTriggeredInitialResponse
    ) {
      const triggerAIResponse = async () => {
        try {
          setHasTriggeredInitialResponse(true);
          await reload();
        } catch (error) {
          console.error("Failed to trigger initial AI response:", error);
          setHasTriggeredInitialResponse(false);
        }
      };

      const timeout = setTimeout(triggerAIResponse, 300);
      return () => clearTimeout(timeout);
    }
  }, [
    displayMessages,
    aiEnabled,
    aiIsLoading,
    isSending,
    reload,
    hasTriggeredInitialResponse,
  ]);

  // Handle message sending
  const handleSendMessage = useCallback(async () => {
    if (
      !user?.id ||
      (!input.trim() && !hasFilesToSend) ||
      isSending ||
      aiIsLoading
    ) return;

    setIsSending(true);

    try {
      await stopTyping();

      if (aiEnabled && input.trim()) {
        if (hasFilesToSend && uploadedFileIds.length > 0) {
          await submitWithFiles(uploadedFileIds);
        } else {
          await aiHandleSubmit();
        }
      }

      if (hasFilesToSend) {
        clearUploadedFiles();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }, [
    user?.id,
    input,
    hasFilesToSend,
    isSending,
    aiIsLoading,
    uploadedFileIds,
    clearUploadedFiles,
    stopTyping,
    aiEnabled,
    aiHandleSubmit,
    submitWithFiles,
  ]);

  // Handle input changes with typing indicators
  const handleInputChange = useCallback(async (value: string) => {
    aiHandleInputChange({
      target: { value },
    } as React.ChangeEvent<HTMLInputElement>);

    if (value.length > 0) {
      await setTyping(true);
    } else {
      await stopTyping();
    }
  }, [aiHandleInputChange, setTyping, stopTyping]);

  // Auto-stop typing after inactivity
  useEffect(() => {
    if (input.length === 0) return;

    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [input, stopTyping]);

  return (
    <div className="flex-1 flex flex-col w-full h-full mt-11 sm:mt-0 relative mx-auto overflow-hidden">
      <ChatScrollManager
        messages={displayMessages}
        isStreaming={aiIsLoading}
        conversationId={conversationId}
        typingUsers={typingUsers}
        aiError={aiError}
      />
      
      <div className="w-full relative z-10">
        <MessageInput
          value={input}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          onStop={stop}
          disabled={isSending || aiIsLoading}
          placeholder={aiIsLoading ? "AI is responding..." : "Type a message..."}
          uploadingFiles={uploadingFiles}
          onUploadFiles={uploadFiles}
          onRemoveFile={removeFile}
          isUploading={isUploading}
          hasFilesToSend={hasFilesToSend}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isStreaming={aiIsLoading}
        />
      </div>
    </div>
  );
}