import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";

import type { FileRouter } from "@/app/api/uploadthing/route";

export const UploadButton = generateUploadButton<FileRouter>();
export const UploadDropzone = generateUploadDropzone<FileRouter>();

export const { useUploadThing, uploadFiles } = generateReactHelpers<FileRouter>(); 