"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useUploadThing } from "@/lib/uploadthing";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

export interface FileWithPreview {
  file: File;
  preview?: string;
  uploading?: boolean;
  uploaded?: boolean;
  fileId?: Id<"files">;
  error?: string;
  // For files uploaded to storage but not yet saved to database
  uploadResult?: {
    key: string;
    name: string;
    size: number;
    url: string;
    type: string;
  };
}

export const useFiles = (conversationId?: Id<"conversations">) => {
  const [uploadingFiles, setUploadingFiles] = useState<FileWithPreview[]>([]);
  const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([]);

  const { user } = useUser();
  const createFile = useMutation(api.files.create);
  const getFiles = useQuery(
    api.files.getByConversation, 
    conversationId ? { conversationId } : "skip"
  );

  const { startUpload: startImageUpload } = useUploadThing("imageUploader");
  const { startUpload: startPdfUpload } = useUploadThing("pdfUploader");

  // Upload files immediately to storage (works for both new and existing chats)
  const uploadFiles = async (files: File[]) => {
    const { validFiles, errors } = validateFiles(files);
    
    // Show validation errors to user if any
    if (errors.length > 0) {
      console.error("File validation errors:", errors);
      
      // Show toast notifications for validation errors
      if (errors.length === 1) {
        toast.error(errors[0]);
      } else {
        toast.error(`${errors.length} files rejected`, {
          description: errors.join('\n'),
          duration: 5000, // Show longer for multiple errors
        });
      }
      
      // If no valid files, return early
      if (validFiles.length === 0) {
        throw new Error(`Upload failed:\n${errors.join('\n')}`);
      } else {
        // Some files were valid, show info about partial success
        toast.info(`${validFiles.length} files will be uploaded (${errors.length} rejected)`);
      }
    }
    
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
      const allUploadResults: Array<{
        key: string;
        name: string;
        size: number;
        url: string;
        type: string;
      }> = [];

      // Upload images to storage
      if (imageFiles.length > 0) {
        const imageResults = await startImageUpload(imageFiles);
        allUploadResults.push(...(imageResults || []));
      }

      // Upload PDFs to storage
      if (pdfFiles.length > 0) {
        const pdfResults = await startPdfUpload(pdfFiles);
        allUploadResults.push(...(pdfResults || []));
      }

      // If we have a conversationId, create database records immediately
      if (conversationId) {
        const allUploadedIds: Id<"files">[] = [];
        
        for (const result of allUploadResults) {
          const fileId = await createFile({
            key: result.key,
            name: result.name,
            type: result.type?.startsWith('image/') ? "image" : "pdf",
            mimeType: result.type || "application/octet-stream",
            size: result.size,
            url: result.url,
            uploadedBy: user?.id || "unknown",
            conversationId,
          });
          allUploadedIds.push(fileId);
        }

        // Update files to show completion with database IDs
        setUploadingFiles(prev => 
          prev.map((fileWithPreview) => {
            if (filesWithPreview.includes(fileWithPreview)) {
              const resultIndex = validFiles.findIndex(f => f === fileWithPreview.file);
              return {
                ...fileWithPreview,
                uploading: false,
                uploaded: true,
                fileId: allUploadedIds[resultIndex]
              };
            }
            return fileWithPreview;
          })
        );

        setUploadedFileIds(prev => [...prev, ...allUploadedIds]);
        return allUploadedIds;
      } else {
        // No conversationId yet - store upload results for later database creation
        setUploadingFiles(prev => 
          prev.map((fileWithPreview) => {
            if (filesWithPreview.includes(fileWithPreview)) {
              const resultIndex = validFiles.findIndex(f => f === fileWithPreview.file);
              return {
                ...fileWithPreview,
                uploading: false,
                uploaded: true,
                uploadResult: allUploadResults[resultIndex]
              };
            }
            return fileWithPreview;
          })
        );

        return [];
      }
    } catch (error) {
      console.error("Failed to upload files:", error);
      
      // Show toast notification for upload failure
      toast.error("Failed to upload files", {
        description: error instanceof Error ? error.message : "An unexpected error occurred",
      });
      
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

  // Create database records for files that were uploaded to storage but not yet saved to database
  const saveUploadedFilesToDatabase = async (targetConversationId: Id<"conversations">) => {
    const filesWithUploadResults = uploadingFiles.filter(f => f.uploadResult && !f.fileId);
    if (filesWithUploadResults.length === 0) return [];

    try {
      const allUploadedIds: Id<"files">[] = [];
      
      for (const fileWithPreview of filesWithUploadResults) {
        const result = fileWithPreview.uploadResult!;
        const fileId = await createFile({
          key: result.key,
          name: result.name,
          type: result.type.startsWith('image/') ? "image" : "pdf",
          mimeType: result.type,
          size: result.size,
          url: result.url,
          uploadedBy: user?.id || "unknown",
          conversationId: targetConversationId,
        });
        allUploadedIds.push(fileId);
      }

      // Update files to include database IDs
      setUploadingFiles(prev => 
        prev.map(fileWithPreview => {
          if (filesWithUploadResults.includes(fileWithPreview)) {
            const fileIndex = filesWithUploadResults.findIndex(f => f === fileWithPreview);
            return {
              ...fileWithPreview,
              fileId: allUploadedIds[fileIndex],
              uploadResult: undefined // Clear the temporary upload result
            };
          }
          return fileWithPreview;
        })
      );

      setUploadedFileIds(prev => [...prev, ...allUploadedIds]);
      return allUploadedIds;
    } catch (error) {
      console.error("Failed to save uploaded files to database:", error);
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
  
  // Check if there are files ready to be sent (either with database IDs or upload results)
  const hasFilesToSend = uploadedFileIds.length > 0 || uploadingFiles.some(f => f.uploadResult || f.fileId);

  return {
    files: getFiles,
    uploadingFiles,
    uploadedFileIds,
    isUploading,
    hasFilesToSend,
    uploadFiles,
    saveUploadedFilesToDatabase, // Renamed from uploadStagedFiles
    removeFile,
    clearUploadedFiles,
  };
};

export const validateFiles = (files: File[]): { validFiles: File[]; errors: string[] } => {
  const validFiles: File[] = [];
  const errors: string[] = [];
  
  for (const file of files) {
    // Check file type
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    
    if (!isImage && !isPdf) {
      errors.push(`${file.name}: Unsupported file type (${file.type}). Only images and PDFs are allowed.`);
      continue;
    }
    
    // Check file size
    const maxSize = isImage ? 4 * 1024 * 1024 : 16 * 1024 * 1024; // 4MB for images, 16MB for PDFs
    const maxSizeLabel = isImage ? '4MB' : '16MB';
    
    if (file.size > maxSize) {
      errors.push(`${file.name}: File too large (${formatFileSize(file.size)}). Maximum size is ${maxSizeLabel}.`);
      continue;
    }
    
    validFiles.push(file);
  }
  
  return { validFiles, errors };
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 