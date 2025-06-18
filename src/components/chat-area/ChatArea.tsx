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
import { useConversationAccess } from "@/hooks/useConversationAccess";
import { getOrCreateAnonymousId } from "@/lib/utils";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
  aiEnabled: boolean;
  initialSelectedModel?: string;
}

export function ChatArea({ conversationId, aiEnabled, initialSelectedModel }: ChatAreaProps) {
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
  const [selectedModel, setSelectedModel] = useState<string | undefined>(initialSelectedModel);
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
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Transform AI messages to display format
  const displayMessages = useChatMessages({
    aiMessages,
    conversationId,
    user,
    aiIsLoading,
  });

  // Update initial loading state when messages are first loaded
  useEffect(() => {
    if (displayMessages.length > 0 || aiMessages.length > 0) {
      setIsInitialLoading(false);
    }
  }, [displayMessages.length, aiMessages.length]);

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

  const { conversation, isLoading: isAccessLoading } = useConversationAccess(conversationId);

  // Determine if the current user (anon or auth) can send messages
  let canSend = false;
  if (user?.id) {
    // Authenticated user: must be participant or creator
    canSend = !!(
      conversation &&
      (conversation.participants?.includes(user.id) || conversation.createdBy === user.id)
    );
  } else {
    // Anonymous user: must be the creator
    const anonId = getOrCreateAnonymousId();
    canSend = !!(conversation && conversation.createdBy === anonId);
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full mt-11 sm:mt-0 relative mx-auto overflow-hidden">
      <ChatScrollManager
        messages={displayMessages}
        isStreaming={aiIsLoading}
        conversationId={conversationId}
        typingUsers={typingUsers}
        aiError={aiError}
        isInitialLoading={isInitialLoading}
      />
      
      <div className="w-full relative z-10">
        <MessageInput
          value={input}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          onStop={stop}
          disabled={isSending || aiIsLoading || !canSend || isAccessLoading}
          placeholder={
            !canSend
              ? user?.id
                ? "You do not have permission to send messages."
                : "Only the creator can send messages to this conversation."
              : aiIsLoading
              ? "AI is responding..."
              : "Type a message..."
          }
          uploadingFiles={uploadingFiles}
          onUploadFiles={uploadFiles}
          onRemoveFile={removeFile}
          isUploading={isUploading}
          hasFilesToSend={hasFilesToSend}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isStreaming={aiIsLoading}
        />
        {!canSend && !user?.id && (
          <div className="text-center text-sm text-muted-foreground mt-2">
            Only the creator can send messages to this conversation.
          </div>
        )}
      </div>
    </div>
  );
}