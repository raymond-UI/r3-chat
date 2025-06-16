"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversations } from "@/hooks/useConversations";
import {
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { Id } from "../../../convex/_generated/dataModel";
import { VirtualizedConversationList } from "./VirtualizedConversationList";
import dynamic from "next/dynamic";

const ConfirmationModal = dynamic(() => import("../actions/ConfirmationModal").then((mod) => mod.ConfirmationModal), {
  ssr: false,
});

const ConversationShowcaseDialog = dynamic(() => import("../profile/ConversationShowcaseDialog").then((mod) => mod.ConversationShowcaseDialog), {
  ssr: false,
});


interface ConversationListProps {
  activeConversationId?: Id<"conversations">;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewChat: () => void;
}



export function ConversationList({
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: ConversationListProps) {
  const { conversations, remove, pin, isLoading } = useConversations();
  const [searchQuery, setSearchQuery] = useState("");

  // Add state for hovered conversation
  const [hoveredId, setHoveredId] = useState<Id<"conversations"> | null>(null);
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



  const handleQuickStart = () => {
    onNewChat();
  };

  const conversationToDeleteObj = conversations.find(
    (c) => c._id === conversationToDelete
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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

      {/* Virtualized Conversations List */}
      <VirtualizedConversationList
        activeConversationId={activeConversationId}
        onSelectConversation={onSelectConversation}
        onNewChat={onNewChat}
        searchQuery={searchQuery}
        onClearSearch={handleClearSearch}
        onContextMenuPin={handleContextMenuPin}
        onContextMenuRename={handleContextMenuRename}
        onContextMenuDelete={handleContextMenuDelete}
        onContextMenuExport={handleContextMenuExport}
        onContextMenuShowcase={handleContextMenuShowcase}
        onPin={handlePin}
        onDelete={handleDelete}
        hoveredId={hoveredId}
        onSetHoveredId={setHoveredId}
      />

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
