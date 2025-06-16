"use client";

import { createContext, useContext, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";


interface NavigationContextType {
  conversationId: Id<"conversations"> | undefined;
  handleSelectConversation: (id: Id<"conversations">) => void;
  handleNewChat: () => void;
  handleSearch: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined
);

interface NavigationProviderProps {
  children: React.ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Extract conversation ID from pathname
  const conversationId =
    pathname === "/chat"
      ? undefined
      : (pathname.split("/chat/")[1] as Id<"conversations"> | undefined);

  const handleSelectConversation = useCallback(
    (id: Id<"conversations">) => {
      router.push(`/chat/${id}`);
    },
    [router]
  );

  const handleNewChat = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleSearch = useCallback(() => {
    // TODO: Implement search command
    console.log("search");
  }, []);

  const value: NavigationContextType = {
    conversationId,
    handleSelectConversation,
    handleNewChat,
    handleSearch,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextType {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}
