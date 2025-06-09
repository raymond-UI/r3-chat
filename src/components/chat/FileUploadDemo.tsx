"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { StagedFiles } from "./StagedFiles";
import { FilePreview } from "./FilePreview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  Sparkles,
  Download,
} from "lucide-react";
import { FileWithPreview, validateFiles } from "@/hooks/useFiles";
import { Doc } from "../../../convex/_generated/dataModel";

export function FileUploadDemo() {
  const [stagedFiles, setStagedFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length > 0) {
        stageFiles(files);
      }
    };
    input.click();
  };

  const stageFiles = (files: File[]) => {
    const validFiles = validateFiles(files);
    const filesWithPreview = validFiles.map(file => {
      const fileWithPreview: FileWithPreview = { file };
      
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file);
      }
      
      return fileWithPreview;
    });

    setStagedFiles(prev => [...prev, ...filesWithPreview]);
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles(prev => {
      const newFiles = [...prev];
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!);
      }
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const handleUpload = async () => {
    setIsUploading(true);
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsUploading(false);
    setStagedFiles([]);
    alert("Files would be uploaded in a real implementation!");
  };

  const mockFile = {
    _id: "demo-file" as string,
    name: "sample-image.jpg",
    type: "image",
    mimeType: "image/jpeg",
    size: 245760,
    url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop",
    uploadedBy: "demo-user",
    conversationId: "demo-conv" as string,
    uploadedAt: Date.now() - 3600000, // 1 hour ago
    analysisResult:
      "This is a beautiful modern office space featuring clean lines, natural lighting, and minimalist design. The image shows a well-organized workspace with contemporary furniture, large windows, and a professional atmosphere. Perfect for productivity and collaboration.",
    _creationTime: Date.now() - 3600000,
  } as Doc<"files">;

  return (
    <div className="space-y-8 p-6">
      {/* Feature Overview */}
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">File Upload & Analysis</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience our seamless file upload system with instant staging, AI analysis, and beautiful previews
        </p>
      </div>

      {/* Feature Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Upload className="h-5 w-5" />
              Smart Upload
            </CardTitle>
            <CardContent>
              <CardDescription>
                Seamlessly upload images and PDFs with our intuitive drag-and-drop
                interface. Support for JPG, PNG, GIF, WebP (up to 4MB) and PDFs
                (up to 16MB).
              </CardDescription>
            </CardContent>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Analysis
            </CardTitle>
            <CardContent>
              <CardDescription>
                Our AI automatically analyzes uploaded content, providing detailed
                insights, descriptions, and extracting key information from your
                files.
              </CardDescription>
            </CardContent>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Download className="h-5 w-5" />
              Easy Access
            </CardTitle>
            <CardContent>
              <CardDescription>
                View, download, and interact with your files instantly. All
                uploads are securely stored and accessible across your
                conversations.
              </CardDescription>
            </CardContent>
          </CardHeader>
        </Card>
      </div>

      {/* Interactive Demo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Try File Upload
          </CardTitle>
          <CardDescription>
            Upload files to see our staging system in action (demo mode - files
            won&apos;t actually upload)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Staging Area */}
          {stagedFiles.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Staged Files</h4>
              <StagedFiles files={stagedFiles} onRemove={removeStagedFile} />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleFileSelect} disabled={isUploading}>
              <Upload className="h-4 w-4 mr-2" />
              Select Files
            </Button>
            
            {stagedFiles.length > 0 && (
              <Button onClick={handleUpload} disabled={isUploading} variant="outline">
                {isUploading ? "Uploading..." : `Upload ${stagedFiles.length} file(s)`}
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Badge variant="secondary">Supported Formats</Badge>
            </h4>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <ImageIcon className="h-4 w-4" />
                Images: JPG, PNG, GIF, WebP (max 4MB)
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Documents: PDF (max 16MB)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Preview Example */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            File Preview Example
          </CardTitle>
          <CardDescription>
            Here&apos;s how uploaded files appear in conversations with AI
            analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FilePreview file={mockFile} />
        </CardContent>
      </Card>
    </div>
  );
}
