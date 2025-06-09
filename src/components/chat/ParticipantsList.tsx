"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useConversations } from "@/hooks/useConversations";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, UserPlus, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ParticipantsListProps {
  conversationId: Id<"conversations">;
}

export function ParticipantsList({ conversationId }: ParticipantsListProps) {
  const { user } = useUser();
  const { addUser } = useConversations();
  const [isOpen, setIsOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Get conversation details
  const conversation = useQuery(api.conversations.get, { conversationId });
  
  // Get presence info for participants
  const presence = useQuery(api.presence.list, { conversationId });

  const participants = conversation?.participants || [];
  const activeUsers = presence?.filter(p => 
    Date.now() - p.lastSeen < 30000 // Active within last 30 seconds
  ).map(p => p.userId) || [];

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return;
    
    setIsAdding(true);
    try {
      // For demo purposes, we'll use the email as userId
      // In a real app, you'd search for the user by email first
      await addUser(conversationId, newUserEmail.trim());
      setNewUserEmail("");
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to add user:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCopyInviteLink = async () => {
    const inviteLink = `${window.location.origin}/chat?invite=${conversationId}`;
    await navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{participants.length}</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants ({participants.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Participants */}
          <div className="space-y-2">
            {participants.map((participantId) => (
              <div key={participantId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.id === participantId ? user?.imageUrl : undefined} />
                  <AvatarFallback>
                    {participantId === user?.id 
                      ? user?.firstName?.charAt(0) || "U"
                      : participantId.charAt(0).toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {participantId === user?.id ? "You" : participantId}
                  </div>
                  {activeUsers.includes(participantId) && (
                    <Badge variant="secondary" className="text-xs">Online</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add New User */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter user email or ID..."
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddUser();
                }}
              />
              <Button 
                onClick={handleAddUser}
                disabled={!newUserEmail.trim() || isAdding}
                size="sm"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>

            {/* Share Link */}
            <Button
              variant="outline"
              onClick={handleCopyInviteLink}
              className="w-full flex items-center gap-2"
            >
              {linkCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Invite Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 