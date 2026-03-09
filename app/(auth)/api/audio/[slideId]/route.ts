import { NextRequest, NextResponse } from "next/server";
import { db } from "@/config/db";
import { chapterContentSlides } from "@/config/schema";
import { eq } from "drizzle-orm";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { slideId: string } },
) {
  const { slideId } = await params;

  try {
    const result = await db
      .select()
      .from(chapterContentSlides)
      .where(eq(chapterContentSlides.slideId, slideId))
      .limit(1);

    if (!result[0] || !result[0].audioFileUrl) {
      return NextResponse.json({ error: "Audio not found" }, { status: 404 });
    }

    const audioFileUrl = result[0].audioFileUrl;
    let audioBuffer: Buffer | null = null;

    // Check if it's a local URL (e.g., /audio/slide-01.mp3)
    if (audioFileUrl.startsWith("/audio/")) {
      try {
        const fileName = audioFileUrl.replace("/audio/", "");
        const filePath = path.join(process.cwd(), "public", "audio", fileName);
        audioBuffer = await fs.readFile(filePath);
        console.log(`✓ Serving local audio: ${audioFileUrl}`);
      } catch (error) {
        console.error(
          `Failed to read local audio file: ${audioFileUrl}`,
          error,
        );
        return NextResponse.json(
          { error: "Audio file not found" },
          { status: 404 },
        );
      }
    } else if (audioFileUrl.startsWith("http")) {
      // It's a remote URL (e.g., S3)
      try {
        const audioResponse = await fetch(audioFileUrl);

        if (!audioResponse.ok) {
          return NextResponse.json(
            { error: "Failed to fetch audio from remote storage" },
            { status: 500 },
          );
        }

        audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
        console.log(`✓ Serving remote audio from S3: ${audioFileUrl}`);
      } catch (error) {
        console.error(`Failed to fetch remote audio: ${audioFileUrl}`, error);
        return NextResponse.json(
          { error: "Failed to retrieve remote audio" },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        { error: "Invalid audio URL format" },
        { status: 400 },
      );
    }

    if (!audioBuffer) {
      return NextResponse.json(
        { error: "Failed to load audio" },
        { status: 500 },
      );
    }

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Audio route error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve audio" },
      { status: 500 },
    );
  }
}
