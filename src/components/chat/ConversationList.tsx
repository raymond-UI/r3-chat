"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/useConversations";
import { useDebounce } from "@/hooks/useDebounce";
import { useUser } from "@clerk/nextjs";
import {
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConversationItem } from "./ConversationItem";
import dynamic from "next/dynamic";

const ConfirmationModal = dynamic(
  () =>
    import("../actions/ConfirmationModal").then((mod) => mod.ConfirmationModal),
  {
    ssr: false,
  }
);

const ConversationShowcaseDialog = dynamic(
  () =>
    import("../profile/ConversationShowcaseDialog").then(
      (mod) => mod.ConversationShowcaseDialog
    ),
  {
    ssr: false,
  }
);

interface ConversationListProps {
  activeConversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewChat: () => void;
}

type ConversationGroup = {
  label: string;
  conversations: Array<{
    _id: Id<"conversations">;
    title: string;
    lastMessage?: string;
    updatedAt: number;
    isCollaborative?: boolean;
    showcase?: {
      isShownOnProfile: boolean;
      isFeatured: boolean;
      tags: string[];
      description?: string;
      excerpt?: string;
    };
  }>;
};

export function ConversationList({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ConversationListProps) {
  const { user } = useUser();
  const { conversations, pinnedConversations, remove, pin, isLoading } =
    useConversations();
  const [searchQuery, setSearchQuery] = useState("");

  // Debounce search query for performance
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Add state for hovered conversation
  const [hoveredId, setHoveredId] = useState<Id<"conversations"> | null>(null);
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] =
    useState<Id<"conversations"> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showcaseDialogOpen, setShowcaseDialogOpen] = useState(false);
  const [showcaseConversationId, setShowcaseConversationId] =
    useState<Id<"conversations"> | null>(null);
  const router = useRouter();

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  // Filter and sort conversations based on search and sort options
  const filteredAndSortedConversations = useMemo(() => {
    if (!conversations.length) return [];

    // Filter by search query
    let filtered = conversations;
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = conversations.filter(
        (conversation) =>
          conversation.title.toLowerCase().includes(query) ||
          (conversation.lastMessage &&
            conversation.lastMessage.toLowerCase().includes(query))
      );
    }

    // Sort conversations
    const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);

    return sorted;
  }, [conversations, debouncedSearchQuery]);

  // Pin/unpin logic
  const handlePin = (id: Id<"conversations">, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent conversation selection
    }
    pin(id).catch((error) => {
      console.error("Failed to toggle pin:", error);
    });
  };

  // Delete logic
  const handleDelete = (id: Id<"conversations">, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setConversationToDelete(id);
    setIsDeleteModalOpen(true);
  };

  // Showcase logic
  const handleShowcase = (
    id: Id<"conversations">,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.stopPropagation();
    }
    setShowcaseConversationId(id);
    setShowcaseDialogOpen(true);
  };

  // Context menu handlers
  const handleContextMenuPin = (conversationId: Id<"conversations">) => {
    handlePin(conversationId);
  };

  const handleContextMenuRename = (conversationId: Id<"conversations">) => {
    console.log("rename", conversationId);
    // TODO: Implement rename functionality
    toast.info("Rename functionality coming soon!");
  };

  const handleContextMenuDelete = (conversationId: Id<"conversations">) => {
    handleDelete(conversationId);
  };

  const handleContextMenuExport = (conversationId: Id<"conversations">) => {
    console.log("export", conversationId);
    // TODO: Implement export functionality
    toast.info("Export functionality coming soon!");
  };

  const handleContextMenuShowcase = (conversationId: Id<"conversations">) => {
    handleShowcase(conversationId);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;

    setIsDeleting(true);
    try {
      await remove(conversationToDelete);
      setIsDeleteModalOpen(false);
      setConversationToDelete(null);
      router.replace(`/`);
      toast.success("Conversation deleted successfully");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Split conversations into pinned and unpinned using persistent data
  const pinnedConversationsList = filteredAndSortedConversations.filter((c) =>
    pinnedConversations.includes(c._id)
  );

  const groupedConversations = useMemo(() => {
    if (!filteredAndSortedConversations.length) return [];

    // If searching, don't group by date - show all results in one list
    if (debouncedSearchQuery.trim()) {
      return [
        {
          label: "Search Results",
          conversations: filteredAndSortedConversations,
        },
      ];
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: ConversationGroup[] = [
      { label: "Today", conversations: [] },
      { label: "Yesterday", conversations: [] },
      { label: "Last 7 days", conversations: [] },
      { label: "Last 30 days", conversations: [] },
      { label: "Older", conversations: [] },
    ];

    filteredAndSortedConversations.forEach((conversation) => {
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
  }, [filteredAndSortedConversations, debouncedSearchQuery]);

  const handleQuickStart = () => {
    onNewChat();
  };

  const conversationToDeleteObj = conversations.find(
    (c) => c._id === conversationToDelete
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex flex-col items-center justify-between">
          <h2 className="sr-only">Conversations</h2>
          <Button onClick={handleQuickStart} className="w-full">
            New chat
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative px-2">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-6 h-9 bg-sidebar rounded-none border-none border-b focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingUI />
      ) : (
        <>
      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
            {!user && (
              <p className="text-xs mt-1 mb-2">
                Anonymous conversations are temporary
              </p>
            )}
          </div>
        ) : groupedConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations found</p>
            <p className="text-xs mt-1">
              Try adjusting your search or sorting options
            </p>
            {debouncedSearchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSearch}
                className="mt-2"
              >
                Clear search
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4 mt-8">
            {/* Pinned group - Only show for authenticated users */}
            {user && pinnedConversationsList.length > 0 && (
              <div className="mt-2 p-2">
                <div
                  className="flex items-center justify-between px-2 cursor-pointer select-none"
                  onClick={() => setPinnedOpen((v) => !v)}
                >
                  <h3 className="text-xs font-bold text-primary tracking-wider font-mono mb-2">
                    Pinned
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {pinnedOpen ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </span>
                </div>
                {pinnedOpen && (
                  <div className="space-y-1">
                    {pinnedConversationsList.map((conversation) => (
                      <ConversationItem
                        key={conversation._id}
                        conversation={conversation}
                        isPinned={true}
                        activeConversationId={activeConversationId}
                        hoveredId={hoveredId}
                        pinnedConversations={pinnedConversations}
                        // user={user}
                        onSelectConversation={onSelectConversation}
                        onSetHoveredId={setHoveredId}
                        onContextMenuPin={handleContextMenuPin}
                        onContextMenuRename={handleContextMenuRename}
                        onContextMenuDelete={handleContextMenuDelete}
                        onContextMenuExport={handleContextMenuExport}
                        onContextMenuShowcase={handleContextMenuShowcase}
                        onPin={handlePin}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Regular groups */}
            {groupedConversations.map((group) => (
              <div key={group.label} className="mt-2 p-2">
                <h3 className="text-xs font-medium text-primary tracking-wider px-2 font-mono mb-2">
                  {group.label}
                </h3>
                <div className="space-y-1">
                  {group.conversations
                    .filter((c) => !pinnedConversations.includes(c._id))
                    .map((conversation) => (
                      <ConversationItem
                        key={conversation._id}
                        conversation={conversation}
                        isPinned={false}
                        activeConversationId={activeConversationId}
                        hoveredId={hoveredId}
                        pinnedConversations={pinnedConversations}
                        // user={user}
                        onSelectConversation={onSelectConversation}
                        onSetHoveredId={setHoveredId}
                        onContextMenuPin={handleContextMenuPin}
                        onContextMenuRename={handleContextMenuRename}
                        onContextMenuDelete={handleContextMenuDelete}
                        onContextMenuExport={handleContextMenuExport}
                        onContextMenuShowcase={handleContextMenuShowcase}
                        onPin={handlePin}
                        onDelete={handleDelete}
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      </>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Conversation"
        titleIcon={<Trash2 className="h-4 w-4" />}
        description={`Are you sure you want to delete "${conversationToDeleteObj?.title}"? This action cannot be undone.`}
        confirmButtonProps={{
          variant: "destructive",
          onClick: confirmDelete,
          disabled: isDeleting,
          children: isDeleting ? "Deleting..." : "Delete",
        }}
      />

      {/* Showcase Dialog */}
      {showcaseConversationId && (
        <ConversationShowcaseDialog
          conversationId={showcaseConversationId}
          isOpen={showcaseDialogOpen}
          onClose={() => {
            setShowcaseDialogOpen(false);
            setShowcaseConversationId(null);
          }}
        />
      )}
    </div>
  );
}



function LoadingUI() {
  return (
    <div className="p-2">
      <div className="animate-pulse">
        <div className="h-8 border border-border/30 bg-muted/50 rounded-md mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 border border-border/30 bg-muted/50 rounded-md"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
