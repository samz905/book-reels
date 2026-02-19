import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

// Allow up to 120s for Veo operations (requires Vercel Pro)
export const maxDuration = 120;

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

    const operationName = operation.name;
    if (!operationName) {
      return NextResponse.json(
        { error: "Video generation started but no operation name returned" },
        { status: 500 }
      );
    }

    console.log("Video generation started, operation:", operationName);

    return NextResponse.json({
      operationName,
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

// GET - Check operation status (stateless — reconstructs from operation name)
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

    // Poll via REST API directly — the SDK's getVideosOperation requires a
    // full class instance which we can't reconstruct across serverless calls.
    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Operation poll failed:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to poll operation", details: errText },
        { status: res.status }
      );
    }

    const operation = await res.json();
    console.log("Operation response:", JSON.stringify(operation).slice(0, 500));

    if (!operation.done) {
      return NextResponse.json({
        status: "processing",
        done: false,
        message: "Video is still being generated...",
      });
    }

    // The raw REST API nests the result differently from the SDK.
    // Try all known paths to find the generated videos.
    const resp = operation.response ?? {};
    const generatedVideos =
      resp.generateVideoResponse?.generatedSamples ??
      resp.generatedVideos ??
      resp.generateVideoResponse?.generatedVideos ??
      resp.videos;

    if (!generatedVideos || generatedVideos.length === 0) {
      console.error("Full operation.response:", JSON.stringify(resp));
      return NextResponse.json(
        { error: "No video was generated", details: JSON.stringify(resp) },
        { status: 500 }
      );
    }

    const video = generatedVideos[0].video ?? generatedVideos[0];
    const uri = video?.uri ?? video?.url;
    const mimeType = video?.mimeType ?? video?.encoding ?? "video/mp4";
    console.log("Video generated:", { uri, mimeType });

    return NextResponse.json({
      status: "completed",
      done: true,
      video: { uri, mimeType },
    });
  } catch (error) {
    console.error("Error checking video status:", error);
    return NextResponse.json(
      { error: "Failed to check video status", details: String(error) },
      { status: 500 }
    );
  }
}
