import SharePageClient from "./SharePageClient";
import { PageParams } from "@/types/params";

export default async function SharePage(
  context: PageParams
): Promise<React.ReactNode> {
  const { shareId } = await context.params;

  return <SharePageClient shareId={shareId} />;
}
