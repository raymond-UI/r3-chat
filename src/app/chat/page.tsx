"use client";

import { useState } from "react";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { ConversationList } from "@/components/chat/ConversationList";
import { ChatArea } from "@/components/chat/ChatArea";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { Id } from "../../../convex/_generated/dataModel";

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<Id<"conversations"> | undefined>();

  return (
    <div className="flex h-[calc(100vh-50px)] gap-4">
      <SignedOut>
        <div className="flex items-center justify-center w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Welcome to R3 Chat</h1>
            <p className="text-muted-foreground mb-4">Please sign in to start chatting</p>
            <a 
              href="/auth" 
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
            >
              Sign In
            </a>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {/* Sidebar - Conversation List */}
        <div className="w-80 bg-secondary/15 border-r border-border flex-shrink-0">
          <ConversationList
            activeConversationId={activeConversationId}
            onSelectConversation={setActiveConversationId}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-background rounded-tl-xl rounded-br-lg">
          {activeConversationId ? (
            <ChatArea conversationId={activeConversationId} />
          ) : (
            <WelcomeScreen onStartChat={setActiveConversationId} />
          )}
        </div>
      </SignedIn>
    </div>
  );
} 