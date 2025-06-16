"use client";
import { ConversationList } from "@/components/chat/ConversationList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { LogIn, Plus, Settings, User } from "lucide-react";
import Link from "next/link";
import { SidebardDropdownAction } from "../actions/SidebardDropdownAction";
import { useNavigation } from "./NavigationProvider";

export function ChatSidebar() {
  const { hasProfile, profileUrl } = useUserProfile();
  const { conversationId, handleSelectConversation, handleNewChat } =
    useNavigation();

  return (
    <Sidebar className="border-none" collapsible="offcanvas" side="left">
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 px-4">
        <div className="flex items-center justify-between">
          {/* Desktop trigger - hidden on mobile, visible when expanded */}
          <SidebarTrigger className="flex group-data-[collapsible=icon]:block" />
          <div className="text-center w-full group-data-[collapsible=icon]:hidden">
            <h2 className="text-base font-semibold">R3 Chat</h2>
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
          onClick={handleNewChat}
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
            activeConversationId={conversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SignedIn>
              <div className="flex items-center justify-between gap-2">
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {hasProfile && profileUrl ? (
                      <DropdownMenuItem asChild>
                        <Link
                          href={profileUrl}
                          className="flex items-center gap-2"
                        >
                          <User className="w-4 h-4" />
                          View Profile
                        </Link>
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem asChild>
                      <Link
                        href="/profile/edit"
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        {hasProfile ? "Edit Profile" : "Create Profile"}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        API Keys & Models
                      </Link>
                    </DropdownMenuItem>
                    {!hasProfile && (
                      <>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Create a profile to showcase your conversations
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <SidebardDropdownAction />
              </div>
            </SignedIn>
            <SignedOut>
              <SidebarMenuButton
                tooltip="Sign In"
                onClick={() => (window.location.href = "/auth")}
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
                  onClick={() => (window.location.href = "/auth")}
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
