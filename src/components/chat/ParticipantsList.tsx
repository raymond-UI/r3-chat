"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Copy, Check, Share, Plus, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ShareConversationDialog } from "./ShareConversationDialog";
import { toast } from "sonner";

interface ParticipantsListProps {
  conversationId: Id<"conversations">;
}

export function ParticipantsList({ conversationId }: ParticipantsListProps) {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const createInvite = useMutation(api.conversations.createInvite);
  const listInvites = useQuery(api.conversations.listInvites, { conversationId });

  // Get conversation details
  const conversationResult = useQuery(api.conversations.get, {
    conversationId,
  });
  const conversation = conversationResult?.success
    ? conversationResult.conversation
    : null;

  // Get presence info for participants
  const presence = useQuery(api.presence.list, { conversationId });

  const participants = conversation?.participants || [];
  // Remove duplicates to ensure unique keys
  const uniqueParticipants = [...new Set(participants)];
  
  const activeUsers =
    presence
      ?.filter(
        (p) => Date.now() - p.lastSeen < 30000 // Active within last 30 seconds
      )
      .map((p) => p.userId) || [];

  const handleCreateAndCopyInvite = async () => {
    setIsCreatingInvite(true);
    setLinkCopied(false);
    
    try {
      // Create a new invite that expires in 7 days
      const result = await createInvite({
        conversationId,
        expiresIn: 24 * 7, // 7 days in hours
        maxUses: 50, // Reasonable limit
      });

      // Copy invite link to clipboard
      const inviteLink = `${window.location.origin}/chat?invite=${result.inviteCode}`;
      await navigator.clipboard.writeText(inviteLink);
      
      setLinkCopied(true);
      toast.success("Invite link created and copied to clipboard!");
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (error) {
      console.error("Failed to create invite:", error);
      toast.error("Failed to create invite link");
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyExistingInvite = async (inviteCode: string) => {
    try {
      const inviteLink = `${window.location.origin}/chat?invite=${inviteCode}`;
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy invite:", error);
      toast.error("Failed to copy invite link");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{uniqueParticipants.length}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({uniqueParticipants.length})
          </DialogTitle>
        </DialogHeader>
        <DialogDescription>
          Manage conversation participants and create invite links.
        </DialogDescription>

        <div className="space-y-4">
          {/* Current Participants */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Participants</h3>
            {uniqueParticipants.map((participantId, index) => (
              <div
                key={`participant-${participantId}-${index}`}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={
                      user?.id === participantId ? user?.imageUrl : undefined
                    }
                  />
                  <AvatarFallback>
                    {participantId === user?.id
                      ? user?.firstName?.charAt(0) || "U"
                      : participantId.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 gap-1">
                  <span className="font-medium text-sm">
                    {participantId === user?.id ? "You" : user?.firstName}
                  </span>
                  {activeUsers.includes(participantId) && (
                    <Badge variant="secondary" className="ml-1 text-xs">
                      Online
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Invite Management */}
          <div className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-medium">Invite Links</h3>
            
            {/* Create New Invite */}
            <Button
              onClick={handleCreateAndCopyInvite}
              disabled={isCreatingInvite}
              className="w-full flex items-center gap-2"
            >
              {isCreatingInvite ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating Invite...
                </>
              ) : linkCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Invite Link Copied!
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create & Copy Invite Link
                </>
              )}
            </Button>

            {/* Existing Invites */}
            {listInvites && listInvites.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Active Invites:</p>
                {listInvites.slice(0, 3).map((invite) => (
                  <div
                    key={invite._id}
                    className="flex items-center gap-2 p-2 rounded border bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono">{invite.inviteCode}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{invite.usedCount}/{invite.maxUses || '∞'} uses</span>
                        {invite.expiresAt && (
                          <>
                            <span>•</span>
                            <Clock className="h-3 w-3" />
                            <span>expires {formatDate(invite.expiresAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyExistingInvite(invite.inviteCode)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Share Public Button */}
            <Button
              variant="outline"
              onClick={() => setShowShareDialog(true)}
              className="w-full flex items-center gap-2"
            >
              <Share className="h-4 w-4" />
              Share Public
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Share Dialog */}
      <ShareConversationDialog
        conversationId={conversationId}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />
    </Dialog>
  );
}