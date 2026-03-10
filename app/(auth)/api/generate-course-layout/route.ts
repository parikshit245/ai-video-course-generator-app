import { NextResponse, NextRequest } from "next/server";
import { Course_config_prompt } from "@/data/Prompt";
import { db } from "@/config/db";
import { coursesTable } from "@/config/schema";
import { isDatabaseConnectionError, saveLocalCourse } from "@/lib/dbFallback";
import { currentUser } from "@clerk/nextjs/server";
import OpenAI from "openai";

const HF_MODEL = "moonshotai/Kimi-K2.5:novita";

type CourseChapter = {
  chapterId: string;
  chapterTitle: string;
  subContent: string[];
};

type CourseLayout = {
  courseId: string;
  courseName: string;
  courseDescription: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  totalChapters: number;
  chapters: CourseChapter[];
};


type ApiErrorLike = {
  status?: number;
  message?: string;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const toStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3);
};

const extractJsonObject = (value: string) => {
  const trimmed = value.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
};

const sanitizeCourseLayout = (
  value: unknown,
  userInput: string,
  requestedCourseId: string,
): CourseLayout => {
  if (typeof value !== "object" || value === null) {
    throw new Error("Model returned an invalid course object");
  }

  const data = value as Record<string, unknown>;
  const chapters = Array.isArray(data.chapters) ? data.chapters : [];

  const normalizedChapters = chapters
    .map((chapter, index) => {
      if (typeof chapter !== "object" || chapter === null) {
        return null;
      }

      const chapterData = chapter as Record<string, unknown>;
      const chapterTitle =
        typeof chapterData.chapterTitle === "string" && chapterData.chapterTitle.trim()
          ? chapterData.chapterTitle.trim()
          : `Chapter ${index + 1}`;

      const subContent = toStringArray(chapterData.subContent);

      return {
        chapterId:
          typeof chapterData.chapterId === "string" && chapterData.chapterId.trim()
            ? slugify(chapterData.chapterId)
            : slugify(chapterTitle) || `chapter-${index + 1}`,
        chapterTitle,
        subContent,
      };
    })
    .filter((chapter): chapter is CourseChapter => Boolean(chapter))
    .filter((chapter) => chapter.subContent.length > 0)
    .slice(0, 3);

  if (normalizedChapters.length === 0) {
    throw new Error("Model returned no valid chapters");
  }

  const level =
    data.level === "Intermediate" || data.level === "Advanced"
      ? data.level
      : "Beginner";

  return {
    courseId: requestedCourseId || slugify(String(data.courseId || userInput)) || "course-layout",
    courseName:
      typeof data.courseName === "string" && data.courseName.trim()
        ? data.courseName.trim()
        : userInput.trim(),
    courseDescription:
      typeof data.courseDescription === "string" && data.courseDescription.trim()
        ? data.courseDescription.trim()
        : `A concise course on ${userInput.trim()}.`,
    level,
    totalChapters: normalizedChapters.length,
    chapters: normalizedChapters,
  };
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as ApiErrorLike).message === "string"
  ) {
    return (error as ApiErrorLike).message;
  }

  return "Failed to generate course layout";
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

export async function POST(req: NextRequest) {
  try {
    const { userInput, courseId, type } = await req.json();
    let userEmail = "";

    try {
      const user = await currentUser();
      userEmail = user?.primaryEmailAddress?.emailAddress || "";
    } catch (error) {
      console.warn("Unable to read current user for course generation:", error);
    }

    if (!userInput) {
      return NextResponse.json(
        { error: "userInput is required" },
        { status: 400 }
      );
    }

    if (!process.env.HF_API_KEY) {
      return NextResponse.json(
        { error: "HF_API_KEY is missing" },
        { status: 500 }
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
          content: `${Course_config_prompt}\n\nCourse Topic is ${userInput}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8000,
    });

    const rawResult = chatCompletion.choices[0]?.message?.content;

    if (!rawResult) {
      throw new Error("Model returned empty response");
    }

    let parsedResult;

    try {
      parsedResult = JSON.parse(extractJsonObject(rawResult));
    } catch {
      throw new Error("Model returned invalid JSON");
    }

    const JSONResult = sanitizeCourseLayout(parsedResult, userInput, courseId);

    try {
      const courseResult = await db
        .insert(coursesTable)
        .values({
          courseId,
          courseName: JSONResult.courseName,
          userInput,
          type,
          courseLayout: JSONResult,
          userId: userEmail,
        })
        .returning();

      return NextResponse.json(courseResult[0]);
    } catch (error) {
      if (!isDatabaseConnectionError(error)) {
        throw error;
      }

      console.warn(
        "Database unavailable in /api/generate-course-layout, saving locally",
      );

      const localCourse = await saveLocalCourse({
        courseId,
        courseName: JSONResult.courseName,
        userInput,
        type,
        courseLayout: JSONResult,
        userId: userEmail,
      });

      return NextResponse.json(localCourse);
    }

  } catch (error) {
    console.error("LLM API Error:", error);

    const errorMessage = getErrorMessage(error);
    const errorStatus = getErrorStatus(error);

    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}