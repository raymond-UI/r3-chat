import { createRouteHandler } from "uploadthing/next";
import {
  createUploadthing,
  type FileRouter as UploadThingFileRouter,
} from "uploadthing/next";
import { auth } from "@clerk/nextjs/server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
const ourFileRouter = {
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
      console.log("Upload complete for userId:", metadata.userId);
      console.log("file url", file.url);

      // !!! Whatever is returned here is sent to the clientside `onClientUploadComplete` callback
      return {
        uploadedBy: metadata.userId,
        url: file.url,
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
      console.log("file url", file.url);

      return {
        uploadedBy: metadata.userId,
        url: file.url,
        name: file.name,
        size: file.size,
        type: "pdf",
      };
    }),
} satisfies UploadThingFileRouter;

export type FileRouter = typeof ourFileRouter;

const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});

export { GET, POST };
