import { NextResponse, NextRequest } from "next/server";
import { genAI } from "@/lib/gemini";
import { Course_config_prompt } from "@/data/Prompt";
import { OpenAI } from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/config/db";
import { coursesTable } from "@/config/schema";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    const { userInput, courseId, type } = await req.json();
    const user = await currentUser();
    if (!userInput) {
      return NextResponse.json(
        { error: "userInput is required" },
        { status: 400 }
      );
    }

const client = new OpenAI({
	baseURL: "https://router.huggingface.co/hf-inference/models/katanemo/Arch-Router-1.5B",
	apiKey: (process.env.HF_API_KEY as string) ,
});

const chatCompletion = await client.chat.completions.create({
	model: "Qwen3.5-397B-A17B-FP8",
    messages: Course_config_prompt + "\n\nCourse Topic is " + userInput,
});

    // const model = genAI.getGenerativeModel({
    //   model: "gemini-2.5-flash",
    //   generationConfig: {
    //     responseMimeType: "application/json",
    //     temperature: 0.3,
    //   },
    // });

    // const response = await model.generateContent(
    //   Course_config_prompt + "\n\nCourse Topic is " + userInput
    // );

    const rawResult = chatCompletion.choices[0].message.content || "";
    const JSONResult = JSON.parse(rawResult);

    //save to DB
    const courseResult = await db.insert(coursesTable).values({
      courseId: courseId,
      courseName: JSONResult.courseName,
      userInput: userInput,
      type: type,
      courseLayout: JSONResult,
      userId: user?.primaryEmailAddress?.emailAddress || '',
    }).returning();

    return NextResponse.json(courseResult[0]);
  } catch (error) {
    console.error("Gemini API Error:", error);

    return NextResponse.json(
      { error: "Failed to generate course layout" },
      { status: 500 }
    );
  }
}
