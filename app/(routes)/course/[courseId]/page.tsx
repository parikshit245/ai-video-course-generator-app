"use client";
import React, { useEffect, useState } from "react";
import CourseInfoCard from "./_components/CourseInfoCard";
import axios from "axios";
import { useParams } from "next/navigation";
import { Course } from "@/type/CourseType";
import CourseChapter from "./_components/CourseChapter";
import { toast } from "sonner";

function CoursePreview() {
  const { courseId } = useParams();
  const [courseDetail, setCourseDetail] = useState<Course>();

  useEffect(() => {
    courseId && GetCourseDetail();
  }, [courseId]);

  const GetCourseDetail = async () => {
    const loadingToast = toast.loading("Loading Course Details...");
    const result = await axios.get("/api/course?courseId=" + courseId);
    console.log(result.data);
    setCourseDetail(result.data);
    toast.success("Course Details Loaded successfully!", { id: loadingToast });
    if (result?.data?.chapterContentSlides?.length === 0) {
     GenerateVideoContent(result?.data);
    }
  };

  const GenerateVideoContent = async (course: Course) => {
  const chapters = Array.isArray(course?.courseLayout?.chapters)
    ? course.courseLayout.chapters
    : [];

  for (let i = 0; i < chapters.length; i++) {
    if (i > 0) break; // Currently processing only the first chapter

    const toastLoading = toast.loading("Generating Video Content for chapter " + (i + 1));
    
    try {
      const result = await axios.post("/api/generate-video-content", {
        chapter: chapters[i], // Sending the specific chapter object
        chapterId: chapters[i].chapterId || i.toString(), // Sending chapterId
        courseId: courseId, // This was missing! It comes from useParams()
      });

      console.log(result.data);
      toast.success("Video Content Generated for chapter " + (i + 1), { id: toastLoading });
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate content", { id: toastLoading });
    }
  }
};

  return (
    <div className="flex flex-col items-center">
      <CourseInfoCard course={courseDetail} />
      <CourseChapter course={courseDetail} />
    </div>
  );
}

export default CoursePreview;
