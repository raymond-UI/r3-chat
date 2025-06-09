import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Helper function to extract text from PDF
async function extractPdfText(url: string): Promise<string> {
  try {
    // Using pdf-parse for server-side PDF text extraction
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Import pdf-parse dynamically
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    
    return data.text || "";
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    return "";
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function extractImageText(_url: string): Promise<string> {
  // For now, return empty string. You could integrate Tesseract.js or cloud OCR here
  // Example: const Tesseract = (await import('tesseract.js')).default;
  return "";
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { fileUrl, fileType, fileName } = body;

    if (!fileUrl || !fileType || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields: fileUrl, fileType, fileName" },
        { status: 400 }
      );
    }

    let extractedText = "";
    let processingResult = {
      fileName,
      fileType,
      fileUrl,
      extractedText: "",
      success: false,
      error: null as string | null
    };

    try {
      if (fileType === "pdf" || fileType === "application/pdf") {
        extractedText = await extractPdfText(fileUrl);
      } else if (fileType.startsWith("image/")) {
        // Optional: Extract text from images using OCR
        extractedText = await extractImageText(fileUrl);
      }

      processingResult = {
        ...processingResult,
        extractedText,
        success: true
      };

    } catch (error) {
      console.error("Document processing failed:", error);
      processingResult.error = error instanceof Error ? error.message : "Unknown error";
    }

    return NextResponse.json(processingResult);

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 