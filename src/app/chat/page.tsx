"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { MessageSquare } from "lucide-react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "@/components/chat-layout/ChatSidebar";
import { ChatArea } from "@/components/chat/ChatArea";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { JoinConversationDialog } from "@/components/chat/JoinConversationDialog";
import { Id } from "../../../convex/_generated/dataModel";

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<
    Id<"conversations"> | undefined
  >();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [pendingInviteId, setPendingInviteId] =
    useState<Id<"conversations"> | null>(null);
  const searchParams = useSearchParams();

  // Handle invite links
  useEffect(() => {
    const inviteId = searchParams.get("invite");
    if (inviteId) {
      setPendingInviteId(inviteId as Id<"conversations">);
      setJoinDialogOpen(true);
    }
  }, [searchParams]);

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleJoinConversation = (conversationId: Id<"conversations">) => {
    setActiveConversationId(conversationId);
    setJoinDialogOpen(false);
    setPendingInviteId(null);
  };

  const handleCloseJoinDialog = () => {
    setJoinDialogOpen(false);
    setPendingInviteId(null);
  };

  return (
    <div className="h-[calc(100vh-50px)]">
      <SignedOut>
        <div className="flex items-center justify-center w-full h-full">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome to R3 Chat
            </h1>
            <p className="text-muted-foreground max-w-md">
              Please sign in to start chatting and connect with your team
            </p>
            <Button asChild size="lg">
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <SidebarProvider defaultOpen={!sidebarCollapsed}>
          <div className="flex h-screen w-full">
            {/* Sidebar Component */}
            <ChatSidebar
              activeConversationId={activeConversationId}
              onSelectConversation={setActiveConversationId}
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={handleToggleSidebar}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col">
              {/* Header with Sidebar Trigger */}
              <header className="flex h-14 items-center gap-4 border-b border-border/50 px-4 lg:px-6">
                <SidebarTrigger className="lg:hidden" />
                <div className="flex-1">
                  {activeConversationId && (
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Active Chat</span>
                    </div>
                  )}
                </div>
              </header>

              {/* Chat Content */}
              <main className="flex-1 w-full overflow-hidden">
                {activeConversationId ? (
                  <ChatArea conversationId={activeConversationId} />
                ) : (
                  <WelcomeScreen onStartChat={setActiveConversationId} />
                )}
              </main>
            </div>
          </div>
        </SidebarProvider>

        {/* Join Conversation Dialog */}
        <JoinConversationDialog
          conversationId={pendingInviteId}
          isOpen={joinDialogOpen}
          onClose={handleCloseJoinDialog}
          onJoin={handleJoinConversation}
        />
      </SignedIn>
    </div>
  );
}
