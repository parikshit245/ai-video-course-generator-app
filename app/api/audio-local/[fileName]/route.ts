import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(
  req: NextRequest,
  { params }: { params: { fileName: string } },
) {
  const { fileName } = await params;

  // Security: Prevent directory traversal attacks
  if (fileName.includes("..") || fileName.includes("/")) {
    return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
  }

  try {
    // Try to read the audio file from public/audio directory
    const filePath = path.join(
      process.cwd(),
      "public",
      "audio",
      `${fileName}.mp3`,
    );
    const audioBuffer = await fs.readFile(filePath);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error(`Audio file not found: ${fileName}`, error);
    return NextResponse.json({ error: "Audio not found" }, { status: 404 });
  }
}
