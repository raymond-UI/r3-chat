// app/(chat)/layout.tsx
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatSidebar } from "@/components/chat-layout/ChatSidebar";
import { CollapsedMenu } from "@/components/chat-layout/CollapsedMenu";
import { NavigationProvider } from "@/components/chat-layout/NavigationProvider";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const InviteHandler = dynamic(
  () =>
    import("@/components/invites/InviteHandler").then(
      (mod) => mod.InviteHandler
    )
);

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <NavigationProvider>
      <SidebarProvider>
        <div className="flex sm:h-screen h-dvh w-full overflow-hidden">
          {/* Collapsed Menu */}
          <CollapsedMenu />

          {/* Unified ChatSidebar */}
          <ChatSidebar />

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col bg-sidebar pt-2 px-2 sm:pt-4 sm:pl-4 h-full transition-all duration-300 ease-in-out">
            <main className="flex-1 bg-background border border-secondary w-full overflow-y-auto overflow-x-hidden rounded-t-2xl sm:rounded-tl-2xl">
              {children}
            </main>
          </div>
        </div>

        <Suspense fallback={null}>
          <InviteHandler />
        </Suspense>
      </SidebarProvider>
    </NavigationProvider>
  );
}
