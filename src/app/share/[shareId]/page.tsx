import SharePageClient from "./SharePageClient";
import { ChatParams } from "@/types/params";

export default async function SharePage(
  context: ChatParams
): Promise<React.ReactNode> {
  const { shareId } = await context.params;

  return <SharePageClient shareId={shareId} />;
}
