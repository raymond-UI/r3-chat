import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useUploadThing } from "@/lib/uploadthing";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

export interface FileWithPreview {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  fileId?: Id<"files">;
  error?: string;
}

export const useFiles = (conversationId: Id<"conversations">) => {
  const [uploadingFiles, setUploadingFiles] = useState<FileWithPreview[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([]);

  const { user } = useUser();
  const createFile = useMutation(api.files.create);
  const getFiles = useQuery(api.files.getByConversation, { conversationId });

  const { startUpload: startImageUpload } = useUploadThing("imageUploader");
  const { startUpload: startPdfUpload } = useUploadThing("pdfUploader");

  // Start uploading files immediately when selected
  const uploadFiles = async (files: File[]) => {
    const validFiles = validateFiles(files);
    
    // Create preview objects for each file
    const filesWithPreview: FileWithPreview[] = validFiles.map(file => {
      const fileWithPreview: FileWithPreview = { 
        file, 
        uploading: true, 
        uploaded: false 
      };
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      
      return fileWithPreview;
    });

    // Add to uploading files immediately
    setUploadingFiles(prev => [...prev, ...filesWithPreview]);

    try {
      // Separate files by type
      const imageFiles = validFiles.filter(f => f.type.startsWith('image/'));
      const pdfFiles = validFiles.filter(f => f.type === 'application/pdf');
      const allUploadedIds: Id<"files">[] = [];

      // Upload images
      if (imageFiles.length > 0) {
        const imageResults = await startImageUpload(imageFiles);
        
        for (const result of imageResults || []) {
          const fileId = await createFile({
            name: result.name,
            type: "image",
            mimeType: result.type || "image/jpeg",
            size: result.size,
            url: result.url,
            uploadedBy: user?.id || "unknown",
            conversationId,
          });
          allUploadedIds.push(fileId);
        }
      }

      // Upload PDFs
      if (pdfFiles.length > 0) {
        const pdfResults = await startPdfUpload(pdfFiles);
        
        for (const result of pdfResults || []) {
          const fileId = await createFile({
            name: result.name,
            type: "pdf",
            mimeType: result.type || "application/pdf",
            size: result.size,
            url: result.url,
            uploadedBy: user?.id || "unknown",
            conversationId,
          });
          allUploadedIds.push(fileId);
        }
      }

      // Update uploading files to show completion
      setUploadingFiles(prev => 
        prev.map(fileWithPreview => {
          const fileIndex = validFiles.findIndex(f => f === fileWithPreview.file);
          if (fileIndex !== -1) {
            return {
              ...fileWithPreview,
              uploading: false,
              uploaded: true,
              fileId: allUploadedIds[fileIndex]
            };
          }
          return fileWithPreview;
        })
      );

      // Store uploaded file IDs for message attachment
      setUploadedFileIds(prev => [...prev, ...allUploadedIds]);

      return allUploadedIds;
    } catch (error) {
      console.error("Failed to upload files:", error);
      
      // Mark files as failed
      setUploadingFiles(prev => 
        prev.map(fileWithPreview => 
          filesWithPreview.includes(fileWithPreview) 
            ? { ...fileWithPreview, uploading: false, error: "Upload failed" }
            : fileWithPreview
        )
      );
      
      throw error;
    }
  };

  // Remove a file from uploading/uploaded state
  const removeFile = (index: number) => {
    setUploadingFiles(prev => {
      const newFiles = [...prev];
      const fileToRemove = newFiles[index];
      
      // Revoke object URL to prevent memory leaks
      if (fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      
      // Remove from uploaded file IDs if it was uploaded
      if (fileToRemove.fileId) {
        setUploadedFileIds(prevIds => prevIds.filter(id => id !== fileToRemove.fileId));
      }
      
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  // Clear all uploaded files (called after message is sent)
  const clearUploadedFiles = () => {
    uploadingFiles.forEach(fileWithPreview => {
      if (fileWithPreview.preview) {
        URL.revokeObjectURL(fileWithPreview.preview);
      }
    });
    setUploadingFiles([]);
    setUploadedFileIds([]);
  };

  // Check if any files are currently uploading
  const isUploading = uploadingFiles.some(f => f.uploading);
  
  // Check if there are files ready to be sent
  const hasFilesToSend = uploadedFileIds.length > 0;

  return {
    files: getFiles,
    uploadingFiles,
    uploadedFileIds,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    removeFile,
    clearUploadedFiles,
  };
};

export const validateFiles = (files: File[]): File[] => {
  const validFiles: File[] = [];
  
  for (const file of files) {
    // Check file type
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      console.warn(`Unsupported file type: ${file.type}`);
      continue;
    }
    
    // Check file size
    const maxSize = isImage ? 4 * 1024 * 1024 : 16 * 1024 * 1024; // 4MB for images, 16MB for PDFs
    if (file.size > maxSize) {
      console.warn(`File too large: ${file.name} (${formatFileSize(file.size)})`);
      continue;
    }
    
    validFiles.push(file);
  }
  
  return validFiles;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 