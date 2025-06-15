import { auth } from "@clerk/nextjs/server";
import {
    createUploadthing,
    type FileRouter,
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
    .onUploadError(({ error, fileKey }) => {
      console.error("Image upload error:", error.message);
      console.error("Failed file key:", fileKey);
      
      // Log specific error details for debugging
      if (error.code === "TOO_LARGE") {
        console.error(`Image file exceeds 4MB limit`);
      } else if (error.code === "BAD_REQUEST") {
        console.error(`Invalid image type`);
      } else {
        console.error(`Image upload failed:`, error.code, error.message);
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
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
    .onUploadError(({ error, fileKey }) => {
      console.error("PDF upload error:", error.message);
      console.error("Failed file key:", fileKey);
      
      // Log specific error details for debugging
      if (error.code === "TOO_LARGE") {
        console.error(`PDF file exceeds 16MB limit`);
      } else if (error.code === "BAD_REQUEST") {
        console.error(`Invalid PDF file or request`);
      } else {
        console.error(`PDF upload failed:`, error.code, error.message);
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("PDF Upload complete for userId:", metadata.userId);
      console.log("file url", file.ufsUrl);

      return {
        uploadedBy: metadata.userId,
        key: file.key,
        url: file.ufsUrl,
        name: file.name,
        size: file.size,
        type: "pdf",
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;