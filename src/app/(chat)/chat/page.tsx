import { NewChatScreen } from "@/components/chat/NewChatScreen";
import { redirect } from "next/navigation";

interface ChatPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const params = await searchParams;
  const inviteId = params.invite;

  // Don't redirect if there's an invite parameter - let the invite dialog handle it
  if (inviteId) {
    return <NewChatScreen />;
  }

  return redirect("/");
}
