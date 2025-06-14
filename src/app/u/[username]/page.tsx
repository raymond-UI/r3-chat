import { ConversationShowcase } from "@/components/profile/ConversationShowcase";
import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { Metadata } from "next";
import { PageParams } from "@/types/params";

export async function generateMetadata(context: PageParams): Promise<Metadata> {
  const { username } = await context.params;

  return {
    title: `${username} - R3 Chat Profile`,
    description: `Check out ${username}'s AI conversations and projects on R3 Chat`,
    openGraph: {
      title: `${username} - R3 Chat Profile`,
      description: `Discover ${username}'s AI conversations and insights`,
      type: "profile",
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function UserProfilePage(
  context: PageParams
): Promise<React.ReactNode> {
  const { page, tag, featured, username } = await context.params;
  const pageNumber = parseInt(page || "1");
  const featuredOnly = featured === "true";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto border border-border/30 rounded-xl">
        <PublicProfileView username={username} />
        <ConversationShowcase
          username={username}
          page={pageNumber}
          tag={tag}
          featuredOnly={featuredOnly}
        />
      </div>
    </div>
  );
}
