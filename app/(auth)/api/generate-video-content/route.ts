import { NextRequest, NextResponse } from "next/server";
import { genAI } from "@/lib/gemini";
import { Generate_Video_Content_Prompt } from "@/data/Prompt";
import { Video_SlidesDummy } from "@/data/Dummy";
import axios from "axios";
import { db } from "@/config/db"; 
import { chapterContentSlides } from "@/config/schema";

export async function POST(req: NextRequest) {
  // Destructure courseId and chapterId from the request body
  const { chapter, chapterId, courseId } = await req.json();

  //Generate JSON schema for video content

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
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
    AiResponse?.replace("```json", "").replace("```", "") || "[]",
  );

  //Audio File generation using TTS for Narration
  // ---- Utility: split text safely for Fonada TTS ----
  function splitText(text: string, maxLength = 400): string[] {
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [];
    const chunks: string[] = [];

    let current = "";

    for (const sentence of sentences) {
      if ((current + sentence).length > maxLength) {
        if (current.trim().length > 0) {
          chunks.push(current.trim());
        }
        current = sentence;
      } else {
        current += sentence;
      }
    }

    if (current.trim().length > 0) {
      chunks.push(current.trim());
    }

    return chunks;
  }


  // Use the dummy data provided
  // const VideoContentJson = Video_SlidesDummy;

for (let i = 0; i < VideoContentJson.length; i++) {
  if(i>0) break; // Currently processing only the first slide
    const slide = VideoContentJson[i];
    const narrationText = slide.narration.fullText;

    if (!narrationText || narrationText.length === 0) continue;

    const chunks = splitText(narrationText);
    
    // 1. Array to hold all audio buffers for this specific slide
    const slideAudioBuffers: Buffer[] = [];

    for (let j = 0; j < chunks.length; j++) {
      const chunk = chunks[j];
      if (chunk.length > 450) continue;

      const fonadaResult = await axios.post(
        "https://api.fonada.ai/tts/generate-audio-large",
        { input: chunk, voice: "vaanee", language: "English" },
        {
          headers: { 
            "Content-Type": "application/json", 
            Authorization: process.env.FONADALABS_API_KEY! 
          },
          responseType: "arraybuffer",
          timeout: 120000,
        },
      );

      // 2. Push each chunk's buffer into the array
      slideAudioBuffers.push(Buffer.from(fonadaResult.data));
    }

    // 3. Concatenate all buffers into ONE single buffer
    const finalSlideAudio = Buffer.concat(slideAudioBuffers);

    console.log(`Slide ${i + 1} complete. Total Audio size:`, finalSlideAudio.length);

    // 4. Save to Neon DB (Now called ONCE per slide)
    await db.insert(chapterContentSlides).values({
      courseId: courseId,
      chapterId: chapterId,
      slideId: slide.slideId, // No more "_chunk_j" suffix
      slideIndex: slide.slideIndex,
      audioData: finalSlideAudio, // Entire merged audio stored as bytea
      narration: slide.narration,
      revelData: { title: slide.title, subtitle: slide.subtitle }, 
      html: slide.html,
    });
  }

  //Storage audio file in cloud storage - Now handled within Neon DB

  //generate captions for audio files

  //save everything to db - Handled in the loop above

  //return response
  return NextResponse.json({ 
    message: "Content and Audio saved successfully",
    data: VideoContentJson 
  });
}