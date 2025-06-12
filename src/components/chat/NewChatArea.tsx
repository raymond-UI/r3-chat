"use client";

import { useChat } from "@/hooks/useChat";
import { useConversations } from "@/hooks/useConversations";
import { useUser } from "@clerk/nextjs";
import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { ModelSelector } from "./ModelSelector";

export function NewChatArea() {
  const { user } = useUser();
  const router = useRouter();
  const { create } = useConversations();
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.0-flash-exp:free");
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    model: selectedModel,
    onFinish: async () => {
      // After AI response is complete in a new chat, we could auto-generate a title
      console.log("New chat response completed");
    },
  });

  // Handle form submission for new chat
  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim() || isLoading || isCreatingConversation || !user?.id) return;

      setIsCreatingConversation(true);

      try {
        // Create new conversation
        const conversationId = await create("New Chat");
        
        // Navigate to the new conversation
        router.push(`/chat/${conversationId}`);
        
        // The form submission will be handled by the chat page
        // For now, we can just proceed with the AI SDK submission
        handleSubmit(e);
      } catch (error) {
        console.error("Failed to create conversation:", error);
        setIsCreatingConversation(false);
      }
    },
    [input, isLoading, isCreatingConversation, user?.id, create, router, handleSubmit]
  );

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading && !isCreatingConversation) {
          const form = e.currentTarget.closest("form");
          if (form) {
            onSubmit({ currentTarget: form } as React.FormEvent<HTMLFormElement>);
          }
        }
      }
    },
    [input, isLoading, isCreatingConversation, onSubmit]
  );

  return (
    <div className="flex-1 flex flex-col w-full h-full mt-11 sm:mt-0 relative mx-auto overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 w-full sm:pt-6 max-w-3xl mx-auto">
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg mb-2">Start a new conversation</p>
              <p className="text-sm">Ask me anything to get started!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message) => {
              const isCurrentUser = message.role === "user";
              const isAI = message.role === "assistant";

              return (
                <div
                  key={message.id}
                  className={`flex flex-col px-2 sm:px-0 gap-1 sm:max-w-[90%] h-full w-full ${
                    isCurrentUser ? "m-auto" : ""
                  }`}
                >
                  {/* Sender */}
                  <div
                    className={`flex items-center mt-4 ${
                      isCurrentUser ? "ml-auto" : ""
                    }`}
                  >
                    <span className="text-xs text-muted-foreground order-1">
                      {isAI ? "Assistant:" : `${user?.firstName || "You"}:`}
                    </span>
                    <div
                      className={`text-xs text-muted-foreground pl-1 ${
                        isCurrentUser ? "ml-auto" : "order-2"
                      }`}
                    >
                      {message.createdAt?.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* Message Content */}
                  <div
                    className={`flex flex-col w-full gap-2 ${
                      isCurrentUser ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl p-2 break-words max-w-full relative ${
                        isAI
                          ? "bg-transparent text-foreground"
                          : "bg-primary/10 text-primary max-h-80 overflow-y-auto"
                      }`}
                    >
                      <MarkdownRenderer content={message.content} />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {(isLoading || isCreatingConversation) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex space-x-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-3 h-3 bg-current rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 100}ms` }}
                    />
                  ))}
                </div>
                <span>
                  {isCreatingConversation ? "Creating conversation..." : "Assistant is typing..."}
                </span>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="text-red-500 text-sm p-2 bg-red-50 rounded-md">
                Error: {error.message}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Input */}
      <div className="w-full">
        <div className="bg-muted/50 backdrop-blur shadow-2xl p-2 pb-0 w-full rounded-t-lg max-w-2xl mx-auto">
          <div className="w-full bg-background rounded-md overflow-clip">
            <form onSubmit={onSubmit} className="flex flex-col items-end">
              {/* Text Input */}
              <div className="w-full relative">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    isLoading || isCreatingConversation 
                      ? "Starting conversation..." 
                      : "Start a new conversation..."
                  }
                  disabled={isLoading || isCreatingConversation}
                  className="min-h-[80px] w-full max-h-[120px] resize-none rounded-none rounded-t-md border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  rows={1}
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between w-full border border-border/50 bg-secondary/5 p-2">
                <div className="flex items-center gap-2">
                  <ModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    hasImages={false}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading || isCreatingConversation}
                  className="flex-shrink-0"
                >
                  {isLoading || isCreatingConversation ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 