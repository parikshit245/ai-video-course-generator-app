import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import OpenAI from "openai";
import { db } from "@/config/db";
import { chapterContentSlides } from "@/config/schema";
import { isDatabaseConnectionError, saveLocalSlides } from "@/lib/dbFallback";
import { Generate_Video_Content_Prompt } from "@/data/Prompt";
import { saveAudio } from "@/lib/audioStorage";

const HF_MODEL = "moonshotai/Kimi-K2.5:novita";

type GeneratedNarration = {
  fullText: string;
};

type GeneratedSlide = {
  slideIndex: number;
  slideId: string;
  audioFileName: string;
  title?: string;
  subtitle?: string;
  narration: GeneratedNarration;
  html: string;
  revealData: string[];
};

type ApiErrorLike = {
  status?: number;
  message?: string;
};

// ================= HELPER FUNCTIONS =================

// Prevent 429 errors
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const TTS_MAX_RETRIES = 5;
const TTS_BASE_DELAY_MS = 2500;

// Split text under 450 chars
const splitTextIntoChunks = (text: string, maxLength: number) => {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxLength) {
    chunks.push(text.slice(i, i + maxLength));
  }
  return chunks;
};

const getRetryDelayMs = (error: unknown, attempt: number) => {
  if (axios.isAxiosError(error)) {
    const retryAfterHeader = error.response?.headers?.["retry-after"];

    if (typeof retryAfterHeader === "string") {
      const retryAfterSeconds = Number(retryAfterHeader);

      if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return retryAfterSeconds * 1000;
      }
    }
  }

  const jitter = Math.floor(Math.random() * 500);
  return TTS_BASE_DELAY_MS * 2 ** attempt + jitter;
};

const shouldRetryTtsError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  return status === 429 || (typeof status === "number" && status >= 500);
};

const requestTtsAudio = async (text: string, chunkIndex: number) => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= TTS_MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        "https://api.fonada.ai/tts/generate-audio-large",
        {
          input: text,
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

      return Buffer.from(response.data);
    } catch (error) {
      lastError = error;

      if (!shouldRetryTtsError(error) || attempt === TTS_MAX_RETRIES) {
        console.error(`TTS error for chunk ${chunkIndex}: `, error);
        throw error;
      }

      const delayMs = getRetryDelayMs(error, attempt);
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;

      console.warn(
        `TTS request for chunk ${chunkIndex} hit status ${status ?? "unknown"}. Retrying in ${delayMs}ms (${attempt + 1}/${TTS_MAX_RETRIES}).`,
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const extractJsonArray = (value: string) => {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");

  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  return trimmed;
};

const toRevealData = (value: unknown, fallbackCount: number) => {
  if (!Array.isArray(value)) {
    return Array.from({ length: fallbackCount }, (_, index) => `r${index + 1}`);
  }

  const revealData = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );

  if (revealData.length > 0) {
    return revealData;
  }

  return Array.from({ length: fallbackCount }, (_, index) => `r${index + 1}`);
};

const sanitizeGeneratedSlides = (value: unknown, chapter: Record<string, unknown>) => {
  if (!Array.isArray(value)) {
    throw new Error("Model returned an invalid slide array");
  }

  const chapterSlug =
    typeof chapter.chapterSlug === "string" && chapter.chapterSlug.trim()
      ? chapter.chapterSlug.trim()
      : typeof chapter.chapterTitle === "string" && chapter.chapterTitle.trim()
        ? slugify(chapter.chapterTitle)
        : "chapter";

  return value.map((slide, index) => {
    if (typeof slide !== "object" || slide === null) {
      throw new Error(`Model returned an invalid slide at index ${index}`);
    }

    const slideData = slide as Record<string, unknown>;
    const narrationData =
      typeof slideData.narration === "object" && slideData.narration !== null
        ? (slideData.narration as Record<string, unknown>)
        : null;

    const fullText =
      typeof narrationData?.fullText === "string" ? narrationData.fullText.trim() : "";

    if (!fullText) {
      throw new Error(`Model returned empty narration for slide ${index + 1}`);
    }

    const slideIndex =
      typeof slideData.slideIndex === "number" && Number.isFinite(slideData.slideIndex)
        ? slideData.slideIndex
        : index + 1;

    const slideId =
      typeof slideData.slideId === "string" && slideData.slideId.trim()
        ? slideData.slideId.trim()
        : `${chapterSlug}-${String(slideIndex).padStart(2, "0")}`;

    const revealCount = Math.max(fullText.split(/[.!?]+/).filter(Boolean).length, 1);

    return {
      slideIndex,
      slideId,
      audioFileName:
        typeof slideData.audioFileName === "string" && slideData.audioFileName.trim()
          ? slideData.audioFileName.trim()
          : `${slideId}.mp3`,
      title:
        typeof slideData.title === "string" && slideData.title.trim()
          ? slideData.title.trim()
          : undefined,
      subtitle:
        typeof slideData.subtitle === "string" && slideData.subtitle.trim()
          ? slideData.subtitle.trim()
          : undefined,
      narration: { fullText },
      html:
        typeof slideData.html === "string" && slideData.html.trim()
          ? slideData.html.trim()
          : "",
      revealData: toRevealData(slideData.revealData, revealCount),
    } satisfies GeneratedSlide;
  });
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiErrorLike).message === "string"
  ) {
    return (error as ApiErrorLike).message;
  }

  return "Failed to generate video content";
};

const getErrorStatus = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as ApiErrorLike).status === "number"
  ) {
    return (error as ApiErrorLike).status;
  }

  return 500;
};

// ================= MAIN API =================

export async function POST(req: NextRequest) {
  try {
    const { chapter, chapterId, courseId } = await req.json();

    if (!chapter || !chapterId || !courseId) {
      return NextResponse.json(
        { error: "chapter, chapterId, and courseId are required" },
        { status: 400 },
      );
    }

    if (!process.env.HF_API_KEY) {
      return NextResponse.json(
        { error: "HF_API_KEY is missing" },
        { status: 500 },
      );
    }

    const client = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: process.env.HF_API_KEY,
    });

    const chatCompletion = await client.chat.completions.create({
      model: HF_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Return only valid JSON. Do not include markdown, commentary, or keys outside the requested schema.",
        },
        {
          role: "user",
          content:
            Generate_Video_Content_Prompt +
            "\n\nChapter Detail Is " +
            JSON.stringify(chapter),
        },
      ],
      temperature: 0.3,
    });

    const rawResult = chatCompletion.choices[0]?.message?.content;

    if (!rawResult) {
      throw new Error("Model returned empty response");
    }

    let parsedSlides: unknown;

    try {
      parsedSlides = JSON.parse(extractJsonArray(rawResult));
    } catch {
      throw new Error("Model returned invalid JSON");
    }

    const VideoContentJson = sanitizeGeneratedSlides(
      parsedSlides,
      chapter as Record<string, unknown>,
    );

    const audioFileUrls: Record<string, string> = {};

    // ================= GENERATE TTS FOR ALL SLIDES =================
    for (let i = 0; i < VideoContentJson.length; i++) {
      const slide = VideoContentJson[i];
      const narration = slide.narration.fullText;

      console.log(
        `Generating audio for slide ${i + 1}/${VideoContentJson.length}: ${slide.slideId}`,
      );

      const chunks = splitTextIntoChunks(narration, 430);
      let mergedAudioBuffer = Buffer.alloc(0);

      for (let j = 0; j < chunks.length; j++) {
        const audioBuffer = await requestTtsAudio(chunks[j], j);
        mergedAudioBuffer = Buffer.concat([mergedAudioBuffer, audioBuffer]);

        await sleep(1800);
      }

      const audioUrl = await saveAudio(mergedAudioBuffer, slide.audioFileName);
      audioFileUrls[i] = audioUrl;

      await sleep(2500);
    }

    // ================= SAVE ALL SLIDES TO DATABASE =================
    try {
      for (let index = 0; index < VideoContentJson.length; index++) {
        const slide = VideoContentJson[index];

        await db
          .insert(chapterContentSlides)
          .values({
            chapterId,
            courseId,
            slideIndex: slide.slideIndex,
            slideId: slide.slideId,
            audioFileName: slide.audioFileName,
            audioFileUrl: audioFileUrls[index] || "",
            narration: slide.narration,
            html: slide.html,
            revealData: slide.revealData,
          })
          .returning();

        console.log(`✓ Slide saved to DB: ${slide.slideId}`);
      }
    } catch (error) {
      if (!isDatabaseConnectionError(error)) {
        throw error;
      }

      console.warn(
        "Database unavailable in /api/generate-video-content, saving locally",
      );

      await saveLocalSlides(
        courseId,
        chapterId,
        VideoContentJson.map((slide, index) => ({
          slideIndex: slide.slideIndex,
          slideId: slide.slideId,
          audioFileName: slide.audioFileName,
          audioFileUrl: audioFileUrls[index] || "",
          narration: slide.narration,
          html: slide.html,
          revealData: slide.revealData,
        })),
      );
    }

    return NextResponse.json({
      slides: VideoContentJson,
      audioUrls: audioFileUrls,
      message: "Video content generated successfully",
    });
  } catch (error) {
    console.error("Video generation error:", error);

    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: getErrorStatus(error) },
    );
  }
}
