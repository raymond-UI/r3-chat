import { redirect } from "next/navigation";
import dynamic from "next/dynamic";

const NewChatScreen = dynamic(
  () =>
    import("@/components/chat/NewChatScreen").then((mod) => mod.NewChatScreen),
  {}
);

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
