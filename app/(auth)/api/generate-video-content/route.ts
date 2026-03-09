import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { db } from "@/config/db";
import { chapterContentSlides } from "@/config/schema";
import { Video_SlidesDummy } from "@/data/Dummy";
import { v4 as uuidv4 } from "uuid";
import { genAI } from "@/lib/gemini";
import { Generate_Video_Content_Prompt } from "@/data/Prompt";
import { saveAudio, getStorageType } from "@/lib/audioStorage";

// ================= HELPER FUNCTIONS =================

// Prevent 429 errors
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Split text under 450 chars
const splitTextIntoChunks = (text: string, maxLength: number) => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.slice(i, i + maxLength));
  }
  return chunks;
};

// ================= MAIN API =================

export async function POST(req: NextRequest) {
  const { chapter, chapterId, courseId } = await req.json();

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // Using current model version
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const response = await model.generateContent(
    Generate_Video_Content_Prompt +
      "Chapter Detail Is " +
      JSON.stringify(chapter),
  );

  const AiResponse = response.response.text();

  const VideoContentJson = JSON.parse(
    AiResponse?.replace("json", "").replace("", "") || "[]",
  );

  // const VideoContentJson = Video_SlidesDummy;
  const audioFileUrls: Record<string, string> = {};

  // ================= GENERATE TTS FOR ALL SLIDES =================
  for (let i = 0; i < VideoContentJson.length; i++) {
    const slide = VideoContentJson[i];
    const narration = slide.narration.fullText;

    console.log(
      `Generating audio for slide ${i + 1}/${VideoContentJson.length}: ${slide.slideId}`,
    );

    // 1️⃣ Split narration into chunks (under 450 chars each for TTS)
    const chunks = splitTextIntoChunks(narration, 430);
    let mergedAudioBuffer = Buffer.alloc(0);

    // 2️⃣ Generate TTS for each chunk and merge
    for (let j = 0; j < chunks.length; j++) {
      try {
        const fonadalabsResponse = await axios.post(
          "https://api.fonada.ai/tts/generate-audio-large",
          {
            input: chunks[j],
            voice: "Vaanee",
            Languages: "en-US",
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.FONADALABS_API_KEY}`,
            },
            responseType: "arraybuffer",
            timeout: 120000,
          },
        );

        const audioBuffer = Buffer.from(fonadalabsResponse.data);
        mergedAudioBuffer = Buffer.concat([mergedAudioBuffer, audioBuffer]);

        // Avoid 429 rate limit errors
        await sleep(700);
      } catch (error) {
        console.error(`TTS error for chunk ${j}: `, error);
        throw error;
      }
    }

    // 3️⃣ Upload merged audio to storage (local or S3)
    const audioUrl = await saveAudio(mergedAudioBuffer, slide.audioFileName);
    audioFileUrls[i] = audioUrl;
  }

  // ================= SAVE ALL SLIDES TO DATABASE =================
  for (let index = 0; index < VideoContentJson.length; index++) {
    const slide = VideoContentJson[index];

    const result = await db
      .insert(chapterContentSlides)
      .values({
        chapterId: chapterId,
        courseId: courseId,
        slideIndex: slide.slideIndex,
        slideId: slide.slideId,
        audioFileName: slide.audioFileName,
        audioFileUrl: audioFileUrls[index] || "",
        narration: slide.narration || {},
        html: slide.html || "",
        audioData: null, // Will be calculated on frontend from audio duration
        revealData: slide.revealData || [],
      })
      .returning();

    console.log(`✓ Slide saved to DB: ${slide.slideId}`);
  }

  return NextResponse.json({
    slides: VideoContentJson,
    audioUrls: audioFileUrls,
    message: "Video content generated successfully",
  });
}
