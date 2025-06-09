import {
    Menu,
    Plus,
    Search,
    SidebarClose,
    User
} from "lucide-react";

import { ConversationList } from "@/components/chat/ConversationList";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Id } from "../../../convex/_generated/dataModel";
import { Input } from "../ui/input";

interface ChatSidebarProps {
  activeConversationId: Id<"conversations"> | undefined;
  onSelectConversation: (id: Id<"conversations"> | undefined) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ChatSidebar({
  activeConversationId,
  onSelectConversation,
  isCollapsed,
  onToggleCollapse,
}: ChatSidebarProps) {
  return (
    <Sidebar
      className="border-r border-border/50 transition-all duration-300 ease-in-out"
      collapsible="icon"
      side="left"
    >
      {/* Header */}
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="group-data-[collapsible=icon]:hidden">
              <h2 className="text-base font-semibold">R3 Chat</h2>
              <p className="text-xs text-muted-foreground">
                Team Communication
              </p>
            </div>
          </div>

          {/* Desktop collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            title="Toggle Sidebar"
            className="h-8 w-8 p-0 group-data-[collapsible=icon]:hidden hidden lg:flex"
          >
            <SidebarClose
              className={cn(
                "h-4 w-4",
                isCollapsed &&
                  "rotate-180 transition-all duration-300 ease-in-out"
              )}
            />
          </Button>
        </div>
      </SidebarHeader>

      {/* Collapsed Header Actions */}
      <div className="group-data-[collapsible=icon]:block hidden p-2 space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-10 p-0 flex items-center justify-center"
          onClick={onToggleCollapse}
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-10 p-0 flex items-center justify-center"
          title="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-10 p-0 flex items-center justify-center"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <SidebarContent className="px-2 py-4">
        {/* Expanded Header Actions */}
        <div className="group-data-[collapsible=icon]:hidden mb-4 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Search" className="flex-1 bg-background" />
          </div>
          <Separator />
        </div>

        {/* Conversation List Container */}
        <div className="flex-1 overflow-hidden">
          <ConversationList
            activeConversationId={activeConversationId}
            onSelectConversation={onSelectConversation}
          />
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Profile">
              <User className="h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">
                Profile
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
