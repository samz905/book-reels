import { GoogleGenAI, GenerateVideosOperation } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Lazy initialization to avoid build-time errors
let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    });
  }
  return ai;
}

// Store operations in memory (for demo purposes)
// In production, you'd use a database or Redis
const operations = new Map<string, GenerateVideosOperation>();

// POST - Start video generation
export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    console.log("Starting video generation with prompt:", prompt);

    const operation = await getAI().models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
    });

    const operationId = operation.name || `op_${Date.now()}`;
    operations.set(operationId, operation);

    console.log("Video generation started, operation:", operationId);

    return NextResponse.json({
      operationName: operationId,
      status: "processing",
      message: "Video generation started",
    });
  } catch (error) {
    console.error("Error starting video generation:", error);
    return NextResponse.json(
      { error: "Failed to start video generation", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Check operation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operationName = searchParams.get("operationName");

    if (!operationName) {
      return NextResponse.json(
        { error: "operationName is required" },
        { status: 400 }
      );
    }

    console.log("Checking status for operation:", operationName);

    // Get stored operation
    let storedOperation = operations.get(operationName);

    if (!storedOperation) {
      return NextResponse.json(
        { error: "Operation not found. It may have expired." },
        { status: 404 }
      );
    }

    // Poll for updated status
    const operation = await getAI().operations.getVideosOperation({
      operation: storedOperation,
    });

    // Update stored operation with latest state
    operations.set(operationName, operation);

    if (!operation.done) {
      return NextResponse.json({
        status: "processing",
        done: false,
        message: "Video is still being generated...",
      });
    }

    // Video is ready - clean up stored operation
    operations.delete(operationName);

    const generatedVideos = operation.response?.generatedVideos;
    if (!generatedVideos || generatedVideos.length === 0) {
      return NextResponse.json(
        { error: "No video was generated" },
        { status: 500 }
      );
    }

    const video = generatedVideos[0].video;
    console.log("Video generated:", video);

    return NextResponse.json({
      status: "completed",
      done: true,
      video: {
        uri: video?.uri,
        mimeType: video?.mimeType,
      },
    });
  } catch (error) {
    console.error("Error checking video status:", error);
    return NextResponse.json(
      { error: "Failed to check video status", details: String(error) },
      { status: 500 }
    );
  }
}
