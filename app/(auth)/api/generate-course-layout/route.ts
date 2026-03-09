import { NextResponse, NextRequest } from "next/server";
import { Course_config_prompt } from "@/data/Prompt";
import { db } from "@/config/db";
import { coursesTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";

const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct:cerebras";

type ApiErrorLike = {
  status?: number;
  message?: string;
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

    const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: HF_MODEL,
        messages: [
          {
            role: "system",
            content: "Return only valid JSON. Do not include markdown or explanations.",
          },
          {
            role: "user",
            content: `${Course_config_prompt}\n\nCourse Topic is ${userInput}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 1200,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`Hugging Face API error ${response.status}: ${responseText}`);
    }

    let completion;

    try {
      completion = JSON.parse(responseText);
    } catch {
      throw new Error(`Hugging Face returned invalid JSON: ${responseText}`);
    }

    const rawResult = completion.choices?.[0]?.message?.content;

    if (!rawResult) {
      throw new Error("Model returned empty response");
    }

    let JSONResult;

    try {
      JSONResult = JSON.parse(rawResult);
    } catch {
      throw new Error("Model returned invalid JSON");
    }

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
    console.error("LLM API Error:", error);

    const errorMessage = getErrorMessage(error);
    const errorStatus = getErrorStatus(error);

    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}