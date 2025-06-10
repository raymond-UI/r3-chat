import { ChatLayoutClient } from "@/components/chat-layout/ChatLayoutClient";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-screen min-h-screen">
      <ChatLayoutClient>{children}</ChatLayoutClient>
    </div>
  );
}
