import { Plus, User, LogIn } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { ConversationList } from "@/components/chat/ConversationList";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Id } from "../../../convex/_generated/dataModel";

interface ChatSidebarProps {
  activeConversationId: Id<"conversations"> | undefined;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewChat: () => void;
}

export function ChatSidebar({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ChatSidebarProps) {

  return (
    <Sidebar
    className="border-none"
      collapsible="offcanvas"
      side="left"
    >
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 px-4">
        <div className="flex items-center justify-between">

          {/* Desktop trigger - hidden on mobile, visible when expanded */}
          <SidebarTrigger className="flex group-data-[collapsible=icon]:block" />
          <div className="text-center w-full group-data-[collapsible=icon]:hidden">
            <h2 className="text-base  font-semibold">R3 Chat</h2>
          </div>
        </div>
      </SidebarHeader>

      {/* Collapsed Header Actions for desktop */}
      <div className="group-data-[collapsible=icon]:block hidden p-2 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-10 p-0 flex items-center justify-center"
          title="New Chat"
          onClick={onNewChat}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <SidebarContent className="px-2 py-4 border-none">
        {/* Anonymous user notice */}
        <SignedOut>
          <div className="group-data-[collapsible=icon]:hidden mb-4 p-3 bg-muted/50 rounded-lg">
            <h3 className="font-semibold text-sm text-muted-foreground mb-1">
              Anonymous Chat
            </h3>
            <p className="text-xs text-muted-foreground">
              Sign up to save conversations
            </p>
          </div>
        </SignedOut>

        {/* Conversation List Container */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            activeConversationId={activeConversationId}
            onSelectConversation={onSelectConversation}
            onNewChat={onNewChat}
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SignedIn>
              <SidebarMenuButton tooltip="Profile">
                <User className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Profile
                </span>
              </SidebarMenuButton>
            </SignedIn>
            <SignedOut>
              <SidebarMenuButton 
                tooltip="Sign In" 
                onClick={() => window.location.href = '/auth'}
                className="group-data-[collapsible=icon]:hidden"
              >
                <LogIn className="h-4 w-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Sign Up Free
                </span>
              </SidebarMenuButton>
              {/* Collapsed state for anonymous users */}
              <div className="group-data-[collapsible=icon]:block hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-10 p-0 flex items-center justify-center"
                  title="Sign Up"
                  onClick={() => window.location.href = '/auth'}
                >
                  <LogIn className="h-4 w-4" />
                </Button>
              </div>
            </SignedOut>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
