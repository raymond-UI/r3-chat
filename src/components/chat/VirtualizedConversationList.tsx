"use client";

import React, { useRef, useCallback, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Id } from "../../../convex/_generated/dataModel";
import { ITEM_HEIGHTS } from "@/types/virtualList";
import { VirtualListItemRenderer } from "./VirtualListItemRenderer";
import {
  useFilteredConversations,
  useGroupedConversations,
  useVirtualListItems,
} from "@/hooks/useVirtualizedConversations";
import { useDebounce } from "@/hooks/useDebounce";
import { useUser } from "@clerk/nextjs";
import { useConversations } from "@/hooks/useConversations";

interface VirtualizedConversationListProps {
  activeConversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewChat: () => void;
  searchQuery: string;
  onClearSearch: () => void;
  // All the conversation handlers from the original component
  onContextMenuPin: (conversationId: Id<"conversations">) => void;
  onContextMenuRename: (conversationId: Id<"conversations">) => void;
  onContextMenuDelete: (conversationId: Id<"conversations">) => void;
  onContextMenuExport: (conversationId: Id<"conversations">) => void;
  onContextMenuShowcase: (conversationId: Id<"conversations">) => void;
  onPin: (id: Id<"conversations">, event?: React.MouseEvent) => void;
  onDelete: (id: Id<"conversations">, event?: React.MouseEvent) => void;
  hoveredId: Id<"conversations"> | null;
  onSetHoveredId: (id: Id<"conversations"> | null) => void;
}

export function VirtualizedConversationList({
  activeConversationId,
  onSelectConversation,
  onNewChat,
  searchQuery,
  onClearSearch,
  onContextMenuPin,
  onContextMenuRename,
  onContextMenuDelete,
  onContextMenuExport,
  onContextMenuShowcase,
  onPin,
  onDelete,
  hoveredId,
  onSetHoveredId,
}: VirtualizedConversationListProps) {
  const { user } = useUser();
  const { conversations, pinnedConversations, isLoading } = useConversations();
  const parentRef = useRef<HTMLDivElement>(null);

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // State for collapsed groups
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Transform data using optimized hooks
  const filteredConversations = useFilteredConversations(conversations, debouncedSearchQuery);
  const groupedConversations = useGroupedConversations(filteredConversations, debouncedSearchQuery);
  const virtualItems = useVirtualListItems(
    groupedConversations,
    pinnedConversations,
    filteredConversations,
    collapsedGroups,
    debouncedSearchQuery
  );

  // Toggle group visibility
  const handleToggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  // Size estimator with dynamic heights
  const getItemSize = useCallback((index: number) => {
    const item = virtualItems[index];
    if (!item) return ITEM_HEIGHTS.conversation;

    switch (item.type) {
      case 'group-header':
        return ITEM_HEIGHTS.groupHeader;
      case 'conversation':
        return ITEM_HEIGHTS.conversation;
      case 'empty-state':
        return ITEM_HEIGHTS.emptyState;
      case 'spacing':
        return item.height;
      default:
        return ITEM_HEIGHTS.conversation;
    }
  }, [virtualItems]);

  // Setup virtualizer
  const rowVirtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getItemSize,
    overscan: 5, // Render 5 extra items above/below viewport for smooth scrolling
  });

  // Early return for loading state
  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden">
        <div className="p-4">
          <div className="animate-pulse">
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If no virtual items to render, render empty state directly
  if (virtualItems.length === 0) {
    return (
      <div className="flex-1 overflow-auto">
        <div className="p-4 text-center text-muted-foreground">
          <div className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No conversations available</p>
          <p className="text-xs mt-1">Debug: {conversations.length} conversations loaded</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef} 
      className="flex-1 overflow-auto"
      style={{ minHeight: '200px' }} // Ensure container has minimum height
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = virtualItems[virtualItem.index];
          if (!item) return null;

          return (
            <VirtualListItemRenderer
              key={virtualItem.key}
              virtualItem={virtualItem}
              item={item}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
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
              onToggleGroup={handleToggleGroup}
              onClearSearch={onClearSearch}
              onNewChat={onNewChat}
            />
          );
        })}
      </div>
    </div>
  );
} 