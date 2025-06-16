"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SignedIn } from "@clerk/nextjs";
import { JoinConversationDialog } from "@/components/chat/JoinConversationDialog";
import { Id } from "../../../convex/_generated/dataModel";

export function InviteHandler() {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(
    null
  );

  const searchParams = useSearchParams();
  const router = useRouter();

  // Handle invite links
  useEffect(() => {
    const inviteParam = searchParams.get("invite");
    if (inviteParam) {
      setPendingInviteCode(inviteParam);
      setJoinDialogOpen(true);
    }
  }, [searchParams]);

  const handleJoinConversation = useCallback(
    (id: Id<"conversations">) => {
      router.push(`/chat/${id}`);
      setJoinDialogOpen(false);
      setPendingInviteCode(null);
    },
    [router]
  );

  const handleCloseJoinDialog = useCallback(() => {
    setJoinDialogOpen(false);
    setPendingInviteCode(null);

    // Clear the invite parameter from URL when closing the dialog
    if (searchParams.get("invite")) {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("invite");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, router]);

  return (
    <SignedIn>
      <JoinConversationDialog
        inviteCode={pendingInviteCode}
        isOpen={joinDialogOpen}
        onClose={handleCloseJoinDialog}
        onJoin={handleJoinConversation}
      />
    </SignedIn>
  );
}
