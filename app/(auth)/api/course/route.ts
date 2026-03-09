import { db } from "@/config/db";
import { chapterContentSlides, coursesTable } from "@/config/schema";
import { getLocalCourse, isDatabaseConnectionError } from "@/lib/dbFallback";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const courseId = req.nextUrl.searchParams.get("courseId");

  // 1. Guard clause: If no courseId is provided, don't even hit the DB
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  try {
    const courses = await db
      .select()
      .from(coursesTable)
      .where(eq(coursesTable.courseId, courseId as string));

    // 2. Guard clause: If course doesn't exist
    if (courses.length === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const chapterContentSlide = await db
      .select()
      .from(chapterContentSlides)
      .where(eq(chapterContentSlides.courseId, courseId as string));

    return NextResponse.json({
      ...courses[0],
      chapterContentSlides: chapterContentSlide,
    });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      console.warn("Database unavailable in /api/course, using local fallback");

      const localCourse = await getLocalCourse(courseId);

      if (localCourse) {
        return NextResponse.json(localCourse);
      }

      return NextResponse.json(
        { error: "Course not found in local fallback" },
        { status: 404 },
      );
    }

    console.error("Database Error:", error);
    return NextResponse.json({ error: "Failed to fetch course data" }, { status: 500 });
  }
}