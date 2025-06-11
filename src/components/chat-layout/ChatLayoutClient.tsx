"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ChatSidebar } from "@/components/chat-layout/ChatSidebar";
import { JoinConversationDialog } from "@/components/chat/JoinConversationDialog";
import { Id } from "../../../convex/_generated/dataModel";
import { CollapsedMenu } from "./CollapsedMenu";

function ChatLayoutInner({ children }: { children: React.ReactNode }) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [pendingInviteId, setPendingInviteId] =
    useState<Id<"conversations"> | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Extract conversation ID from pathname
  const conversationId =
    pathname === "/chat"
      ? undefined
      : (pathname.split("/chat/")[1] as Id<"conversations"> | undefined);

  // Handle invite links
  useEffect(() => {
    const inviteId = searchParams.get("invite");
    if (inviteId) {
      setPendingInviteId(inviteId as Id<"conversations">);
      setJoinDialogOpen(true);
    }
  }, [searchParams]);

  const handleSelectConversation = (id: Id<"conversations">) => {
    router.push(`/chat/${id}`);
  };

  const handleNewChat = () => {
    router.push("/");
  };

  const handleJoinConversation = (id: Id<"conversations">) => {
    router.push(`/chat/${id}`);
    setJoinDialogOpen(false);
    setPendingInviteId(null);
  };

  const handleCloseJoinDialog = () => {
    setJoinDialogOpen(false);
    setPendingInviteId(null);
  };

  const handleSearch = () => {
    // TODO: Implement search commnand
    console.log("search");
  };

  return (
    <div className="h-[calc(100vh-50px)] w-full">
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
        <SidebarProvider>
          <div className="flex h-screen w-full">
            {/* Persistent Sidebar */}
            <CollapsedMenu onNewChat={handleNewChat} onSearch={handleSearch} />
            <ChatSidebar
              activeConversationId={conversationId}
              onSelectConversation={handleSelectConversation}
              onNewChat={handleNewChat}
              // isCollapsed={sidebarCollapsed}
              // onToggleCollapse={handleToggleSidebar}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col bg-sidebar pt-4 pl-4">
              {/* Dynamic Content */}
              <main className="bg-background border border-secondary flex-1 w-full overflow-hidden rounded-tl-2xl">{children}</main>
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

export function ChatLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-50px)] flex items-center justify-center w-full">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <ChatLayoutInner>{children}</ChatLayoutInner>
    </Suspense>
  );
}
