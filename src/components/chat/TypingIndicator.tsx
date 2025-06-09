"use client";

import { Doc } from "../../../convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TypingIndicatorProps {
  users: Doc<"presence">[];
}

export function TypingIndicator({ users }: TypingIndicatorProps) {
  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="flex -space-x-1">
        {users.slice(0, 3).map((user) => (
          <Avatar key={user.userId} className="h-6 w-6 border-2 border-background">
            <AvatarFallback className="text-xs">
              {user.userId.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      
      <div className="flex items-center gap-1">
        <span>
          {users.length === 1 
            ? "Someone is typing"
            : users.length === 2
            ? "2 people are typing" 
            : `${users.length} people are typing`
          }
        </span>
        
        {/* Animated dots */}
        <div className="flex space-x-1">
          <div className="w-1 h-1 bg-current rounded-full animate-bounce"></div>
          <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-100"></div>
          <div className="w-1 h-1 bg-current rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
} 