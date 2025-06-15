import { PageParams } from "@/types/params";
import { Metadata } from "next";
import { parseConversationSlug } from "@/lib/slugs";
import PublicConversationClient from "./PublicConversationClient";

export async function generateMetadata(context: PageParams): Promise<Metadata> {
  const { username, slug } = await context.params;
  
  // Parse the slug to get the title for better SEO
  let title = `Conversation by ${username}`;
  try {
    const { titleSlug } = parseConversationSlug(slug);
    const readableTitle = titleSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    title = `${readableTitle} by ${username}`;
  } catch {
    // Fallback to generic title if slug parsing fails
  }

  return {
    title: `${title} - R3 Chat`,
    description: `View this public AI conversation shared by ${username}`,
    openGraph: {
      title,
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
  const { username, slug } = await context.params;

  return <PublicConversationClient username={username} slug={slug} />;
} 