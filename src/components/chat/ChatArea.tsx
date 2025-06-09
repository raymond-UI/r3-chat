"use client";

import { MessageInput } from "@/components/chat/MessageInput";
import { MessageList } from "@/components/chat/MessageList";
import { ModelSelector } from "@/components/chat/ModelSelector";
import { ParticipantsList } from "@/components/chat/ParticipantsList";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useAI } from "@/hooks/useAI";
import { useMessages, useSendMessage } from "@/hooks/useMessages";
import { usePresence } from "@/hooks/usePresence";
import { Bot } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Id } from "../../../convex/_generated/dataModel";
import { Switch } from "../ui/switch";

interface ChatAreaProps {
  conversationId: Id<"conversations">;
}

export function ChatArea({ conversationId }: ChatAreaProps) {
  const { messages, isLoading } = useMessages(conversationId);
  const { send } = useSendMessage();
  const { typingUsers, setTyping, stopTyping } = usePresence(conversationId);
  const { selectedModel, setSelectedModel, isGenerating, sendToAI } = useAI();

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isSending) return;

    const content = inputValue.trim();
    setInputValue("");
    setIsSending(true);

    try {
      // Send user message
      await send(conversationId, content);
      await stopTyping();

      // Trigger AI response if enabled
      if (aiEnabled) {
        await sendToAI(conversationId, content, selectedModel);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setInputValue(content); // Restore input on error
    } finally {
      setIsSending(false);
    }
  };

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
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">
          Loading conversation...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full h-full  mx-auto">
      {/* Header with AI Controls */}
      <div className="border-b border-border py-2">
        <div className="flex items-center justify-between">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />

          <div className="flex items-center gap-2">
            <ParticipantsList conversationId={conversationId} />

            <div className="flex items-center gap-2 border rounded-2xl p-1">
              {/* <Bot className="h-4 w-4" /> */}
              <span className="text-sm text-muted-foreground">AI</span>
              <Switch
                checked={aiEnabled}
                onCheckedChange={setAiEnabled}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 w-full sm:pt-6 max-w-3xl mx-auto">
        <MessageList messages={messages} />

        {/* AI Generating Indicator */}
        {isGenerating && (
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="h-4 w-4 animate-pulse" />
              <span>AI is thinking...</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-100"></div>
                <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-200"></div>
              </div>
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
      <div className="border-8 border-secondary/50 p-1 w-full rounded-t-lg max-w-3xl mx-auto">
        <MessageInput
          value={inputValue}
          onChange={handleInputChange}
          onSend={handleSendMessage}
          disabled={isSending || isGenerating}
          placeholder="Type your message..."
        />
      </div>
    </div>
  );
}
