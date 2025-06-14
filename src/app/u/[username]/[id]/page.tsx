import { PageParams } from "@/types/params";
import { Metadata } from "next";
import PublicConversationClient from "./PublicConversationClient";

export async function generateMetadata(context: PageParams): Promise<Metadata> {
  const { username } = await context.params;

  return {
    title: `Conversation by ${username} - R3 Chat`,
    description: `View this public AI conversation shared by ${username}`,
    openGraph: {
      title: `Conversation by ${username}`,
      description: `Discover this AI conversation and insights by ${username}`,
      type: "article",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function PublicConversationPage(
  context: PageParams
): Promise<React.ReactNode> {
  const { username, id } = await context.params;
  console.log("id", id);

  return <PublicConversationClient username={username} conversationId={id} />;
} 