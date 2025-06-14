import { auth } from "@clerk/nextjs/server";
import {
    createUploadthing,
    type FileRouter as UploadThingFileRouter,
} from "uploadthing/next";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    // Set permissions and file types for this FileRoute
    .middleware(async () => {
      // This code runs on your server before upload
      const { userId } = await auth();

      // If you throw, the user will not be able to upload
      if (!userId) throw new Error("Unauthorized");

      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      // TODO: return the key which is used to construct the url and passed to the AI SDK
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return {
        uploadedBy: metadata.userId,
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: "image",
      };
    }),

  pdfUploader: f({ pdf: { maxFileSize: "16MB", maxFileCount: 3 } })
    .middleware(async () => {
      const { userId } = await auth();
      if (!userId) throw new Error("Unauthorized");
      return { userId: userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("PDF Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);
      // TODO: return the key which is used to construct the url and passed to the AI SDK

      return {
        uploadedBy: metadata.userId,
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: "pdf",
      };
    }),
} satisfies UploadThingFileRouter;

export type FileRouter = typeof ourFileRouter;