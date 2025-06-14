"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";

import { SidebarProvider } from "@/components/ui/sidebar";
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
    <div className="w-full">
      <SidebarProvider>
        <div className="flex sm:h-screen h-[100vh] w-full overflow-hidden">
          {/* Persistent Sidebar */}
          <CollapsedMenu onNewChat={handleNewChat} onSearch={handleSearch} />
          
          {/* Unified ChatSidebar for all users */}
          <ChatSidebar
            activeConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />


          <div className="flex flex-1 flex-col bg-sidebar pt-2 px-2 sm:pt-4 sm:pl-4 h-full transition-all duration-300 ease-in-out">
            {/* Dynamic Content */}
            <main className="flex-1 bg-background border border-secondary w-full overflow-hidden rounded-t-2xl sm:rounded-tl-2xl">{children}</main>
          </div>
        </div>
      </SidebarProvider>

      {/* Join Conversation Dialog - Only for signed in users */}
      <SignedIn>
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
