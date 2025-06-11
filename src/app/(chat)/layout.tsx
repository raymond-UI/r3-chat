import { ChatLayoutClient } from "@/components/chat-layout/ChatLayoutClient";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatLayoutClient>{children}</ChatLayoutClient>
  );
}
