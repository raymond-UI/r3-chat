import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { MessageSquare, Search } from "lucide-react";
import type { Id } from "../../convex/_generated/dataModel";
import type { VirtualListItem, ConversationData } from "@/types/virtualList";

export function useFilteredConversations(
  conversations: ConversationData[],
  searchQuery: string
) {
  return useMemo(() => {
    if (!conversations.length) return [];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      return conversations.filter(
        (conversation) =>
          conversation.title.toLowerCase().includes(query) ||
          (conversation.lastMessage &&
            conversation.lastMessage.toLowerCase().includes(query))
      );
    }

    // Sort conversations by updatedAt
    return [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [conversations, searchQuery]);
}

export function useGroupedConversations(
  filteredConversations: ConversationData[],
  searchQuery: string
) {
  return useMemo(() => {
    if (!filteredConversations.length) return [];

    // If searching, don't group by date - show all results in one list
    if (searchQuery.trim()) {
      return [
        {
          label: "Search Results",
          conversations: filteredConversations,
        },
      ];
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups = [
      { label: "Today", conversations: [] as ConversationData[] },
      { label: "Yesterday", conversations: [] as ConversationData[] },
      { label: "Last 7 days", conversations: [] as ConversationData[] },
      { label: "Last 30 days", conversations: [] as ConversationData[] },
      { label: "Older", conversations: [] as ConversationData[] },
    ];

    filteredConversations.forEach((conversation) => {
      const conversationDate = new Date(conversation.updatedAt);

      if (conversationDate >= today) {
        groups[0].conversations.push(conversation);
      } else if (conversationDate >= yesterday) {
        groups[1].conversations.push(conversation);
      } else if (conversationDate >= lastWeek) {
        groups[2].conversations.push(conversation);
      } else if (conversationDate >= lastMonth) {
        groups[3].conversations.push(conversation);
      } else {
        groups[4].conversations.push(conversation);
      }
    });

    // Filter out empty groups
    return groups.filter((group) => group.conversations.length > 0);
  }, [filteredConversations, searchQuery]);
}

export function useVirtualListItems(
  groupedConversations: Array<{ label: string; conversations: ConversationData[] }>,
  pinnedConversations: Id<"conversations">[],
  filteredConversations: ConversationData[],
  collapsedGroups: Set<string>,
  searchQuery: string
): VirtualListItem[] {
  const { user } = useUser();

  return useMemo(() => {
    const items: VirtualListItem[] = [];

    // Handle empty states first
    if (filteredConversations.length === 0) {
      if (searchQuery.trim()) {
        // No search results
        items.push({
          type: "empty-state",
          id: "empty-search",
          message: "No conversations found",
          subMessage: "Try adjusting your search",
          icon: Search,
        });
      } else {
        // No conversations at all
        items.push({
          type: "empty-state",
          id: "empty-conversations",
          message: "No conversations yet",
          subMessage: !user ? "Anonymous conversations are temporary" : undefined,
          icon: MessageSquare,
        });
      }
      return items;
    }

    // Add pinned conversations section (only for authenticated users)
    const pinnedConversationsList = filteredConversations.filter((c) =>
      pinnedConversations.includes(c._id)
    );

    if (user && pinnedConversationsList.length > 0) {
      const pinnedGroupId = "pinned";
      const isPinnedOpen = !collapsedGroups.has(pinnedGroupId);

      items.push({
        type: "group-header",
        id: pinnedGroupId,
        label: "Pinned",
        isCollapsible: true,
        isOpen: isPinnedOpen,
      });

      if (isPinnedOpen) {
        pinnedConversationsList.forEach((conversation) => {
          items.push({
            type: "conversation",
            id: `pinned-${conversation._id}`,
            conversation,
            isPinned: true,
          });
        });
      }
    }

    // Add regular grouped conversations
    groupedConversations.forEach((group) => {
      const groupId = group.label.toLowerCase().replace(/\s+/g, "-");
      const isGroupOpen = !collapsedGroups.has(groupId);

      items.push({
        type: "group-header",
        id: groupId,
        label: group.label,
        isCollapsible: false, // Regular groups are not collapsible for now
        isOpen: isGroupOpen,
      });

      if (isGroupOpen) {
        // Filter out pinned conversations from regular groups
        const unpinnedConversations = group.conversations.filter(
          (c) => !pinnedConversations.includes(c._id)
        );

        unpinnedConversations.forEach((conversation) => {
          items.push({
            type: "conversation",
            id: conversation._id,
            conversation,
            isPinned: false,
          });
        });
      }
    });

    return items;
  }, [
    groupedConversations,
    pinnedConversations,
    filteredConversations,
    collapsedGroups,
    searchQuery,
    user,
  ]);
} 