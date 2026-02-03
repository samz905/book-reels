import { NextRequest, NextResponse } from "next/server";

// Proxy video from Google's authenticated URL
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get("url");

    if (!videoUrl) {
      return NextResponse.json(
        { error: "url parameter is required" },
        { status: 400 }
      );
    }

    // Fetch the video from Google with API key
    const response = await fetch(videoUrl, {
      headers: {
        "x-goog-api-key": process.env.GOOGLE_GENAI_API_KEY || "",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch video:", response.status, response.statusText);
      return NextResponse.json(
        { error: "Failed to fetch video from Google" },
        { status: response.status }
      );
    }

    const videoBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "video/mp4";

    return new NextResponse(videoBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(videoBuffer.byteLength),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error proxying video:", error);
    return NextResponse.json(
      { error: "Failed to proxy video", details: String(error) },
      { status: 500 }
    );
  }
}
