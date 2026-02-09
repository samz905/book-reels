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
// Supports 3 mutually exclusive modes:
//   1. Reference Images: { prompt, referenceImages: [{base64, mimeType}] }
//   2. Image to Video:   { prompt, image: {base64, mimeType}, lastFrame?: {base64, mimeType} }
//   3. Video Extend:     { prompt, video: {base64, mimeType} }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, referenceImages, image, lastFrame, video } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Build config and top-level request params
    const config: Record<string, unknown> = {
      aspectRatio: "9:16",
      durationSeconds: 8,
    };

    const requestParams: Record<string, unknown> = {
      model: "veo-3.1-generate-preview",
      prompt: prompt,
    };

    if (video) {
      // Mode 3: Video Extend — `video` is a top-level param, 720p only
      console.log("Starting video EXTEND generation");
      requestParams.video = {
        videoBytes: video.base64,
        mimeType: video.mimeType || "video/mp4",
      };
      // Video extend requires 720p
      config.aspectRatio = body.aspectRatio || "9:16";
    } else if (image) {
      // Mode 2: Image to Video — `image` is a top-level param (NOT in config)
      console.log("Starting IMAGE-TO-VIDEO generation");
      requestParams.image = {
        imageBytes: image.base64,
        mimeType: image.mimeType || "image/png",
      };
      if (lastFrame) {
        // Optional ending frame goes in config
        config.lastFrame = {
          image: {
            imageBytes: lastFrame.base64,
            mimeType: lastFrame.mimeType || "image/png",
          },
        };
        console.log("  With ending frame (interpolation mode)");
      }
    } else if (referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      // Mode 1: Reference Images — goes in config.referenceImages
      console.log(`Starting video generation with ${referenceImages.length} reference image(s)`);
      config.referenceImages = referenceImages.slice(0, 3).map(
        (ref: { base64: string; mimeType: string }) => ({
          image: {
            imageBytes: ref.base64,
            mimeType: ref.mimeType || "image/png",
          },
          referenceType: "ASSET",
        })
      );
    } else {
      console.log("Starting text-only video generation");
    }

    requestParams.config = config;
    console.log("Prompt:", prompt.slice(0, 100) + "...");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operation = await getAI().models.generateVideos(requestParams as any);

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
    const storedOperation = operations.get(operationName);

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
