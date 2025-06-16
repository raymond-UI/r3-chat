import React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VirtualItem } from "@tanstack/react-virtual";
import type { VirtualListItem } from "@/types/virtualList";
import type { Id } from "../../../convex/_generated/dataModel";
import { MemoizedConversationItem } from "./MemoizedConversationItem";
import type { UserResource } from "@clerk/types";

interface VirtualListItemRendererProps {
  virtualItem: VirtualItem;
  item: VirtualListItem;
  style: React.CSSProperties;
  // Conversation handlers
  activeConversationId?: Id<"conversations">;
  hoveredId: Id<"conversations"> | null;
  pinnedConversations: Id<"conversations">[];
  user: UserResource | null | undefined;
  onSelectConversation: (id: Id<"conversations">) => void;
  onSetHoveredId: (id: Id<"conversations"> | null) => void;
  onContextMenuPin: (conversationId: Id<"conversations">) => void;
  onContextMenuRename: (conversationId: Id<"conversations">) => void;
  onContextMenuDelete: (conversationId: Id<"conversations">) => void;
  onContextMenuExport: (conversationId: Id<"conversations">) => void;
  onContextMenuShowcase: (conversationId: Id<"conversations">) => void;
  onPin: (id: Id<"conversations">, event?: React.MouseEvent) => void;
  onDelete: (id: Id<"conversations">, event?: React.MouseEvent) => void;
  // Group handlers
  onToggleGroup?: (groupId: string) => void;
  // Empty state handlers
  onClearSearch?: () => void;
  onNewChat?: () => void;
}

export function VirtualListItemRenderer({
  virtualItem,
  item,
  style,
  activeConversationId,
  hoveredId,
  pinnedConversations,
  user,
  onSelectConversation,
  onSetHoveredId,
  onContextMenuPin,
  onContextMenuRename,
  onContextMenuDelete,
  onContextMenuExport,
  onContextMenuShowcase,
  onPin,
  onDelete,
  onToggleGroup,
  onClearSearch,
  onNewChat,
}: VirtualListItemRendererProps) {
  const renderGroupHeader = (item: Extract<VirtualListItem, { type: 'group-header' }>) => (
    <div 
      className={`flex items-center justify-between px-2 ${item.isCollapsible ? 'cursor-pointer select-none' : ''}`}
      onClick={item.isCollapsible ? () => onToggleGroup?.(item.id) : undefined}
    >
      <h3 className="text-xs font-bold text-primary tracking-wider font-mono mb-2">
        {item.label}
      </h3>
      {item.isCollapsible && (
        <span className="text-xs text-muted-foreground">
          {item.isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </span>
      )}
    </div>
  );

  const renderConversation = (item: Extract<VirtualListItem, { type: 'conversation' }>) => (
    <MemoizedConversationItem
      conversation={item.conversation}
      isPinned={item.isPinned}
      activeConversationId={activeConversationId}
      hoveredId={hoveredId}
      pinnedConversations={pinnedConversations}
      user={user}
      onSelectConversation={onSelectConversation}
      onSetHoveredId={onSetHoveredId}
      onContextMenuPin={onContextMenuPin}
      onContextMenuRename={onContextMenuRename}
      onContextMenuDelete={onContextMenuDelete}
      onContextMenuExport={onContextMenuExport}
      onContextMenuShowcase={onContextMenuShowcase}
      onPin={onPin}
      onDelete={onDelete}
    />
  );

  const renderEmptyState = (item: Extract<VirtualListItem, { type: 'empty-state' }>) => {
    const IconComponent = item.icon;
    
    return (
      <div className="p-4 text-center text-muted-foreground">
        {IconComponent && (
          <IconComponent className="h-12 w-12 mx-auto mb-2 opacity-50" />
        )}
        <p>{item.message}</p>
        {item.subMessage && (
          <p className="text-xs mt-1 mb-2">{item.subMessage}</p>
        )}
        {item.id === "empty-search" && onClearSearch && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSearch}
            className="mt-2"
          >
            Clear search
          </Button>
        )}
        {item.id === "empty-conversations" && onNewChat && (
          <Button
            onClick={onNewChat}
            className="mt-2"
          >
            Start your first chat
          </Button>
        )}
      </div>
    );
  };

  const renderSpacing = (item: Extract<VirtualListItem, { type: 'spacing' }>) => (
    <div style={{ height: item.height }} />
  );

  return (
    <div
      key={virtualItem.key}
      style={style}
      className="px-2"
    >
      {item.type === 'group-header' && renderGroupHeader(item)}
      {item.type === 'conversation' && renderConversation(item)}
      {item.type === 'empty-state' && renderEmptyState(item)}
      {item.type === 'spacing' && renderSpacing(item)}
    </div>
  );
} 