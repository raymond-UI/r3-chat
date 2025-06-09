"use client";

import { Button } from "@/components/ui/button";
import { MessageSquare, Sparkles, Users } from "lucide-react";
import { useConversations } from "@/hooks/useConversations";
import { Id } from "../../../convex/_generated/dataModel";

interface WelcomeScreenProps {
  onStartChat: (conversationId: Id<"conversations">) => void;
}

export function WelcomeScreen({ onStartChat }: WelcomeScreenProps) {
  const { create } = useConversations();

  const handleStartChat = async (title: string, isCollaborative = false) => {
    try {
      const conversationId = await create(title, isCollaborative);
      onStartChat(conversationId);
    } catch (error) {
      console.error("Failed to create conversation:", error);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Header */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to R3 Chat</h1>
          <p className="text-muted-foreground">
            Start a conversation with AI or collaborate with others in real-time
          </p>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => handleStartChat("AI Chat")}
            className="w-full"
            size="lg"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Start AI Chat
          </Button>
          
          <Button
            onClick={() => handleStartChat("Team Collaboration", true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            Create Collaborative Room
          </Button>
        </div>

        {/* Features */}
        <div className="mt-8 text-sm text-muted-foreground">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real-time messaging</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Multiple AI models</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Live collaboration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 