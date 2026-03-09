"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import CourseInfoCard from "./_components/CourseInfoCard";
import CourseChapter from "./_components/CourseChapter";
import axios from "axios";
import { useParams } from "next/navigation";
import { Course } from "@/type/CourseType";
import { toast } from "sonner";

function CoursePreview() {
  const { courseId } = useParams();

  const [courseDetail, setCourseDetail] = useState<Course | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [durationBySlideId, setDurationBySlideId] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);

  const fps = 30;

  // ===============================
  // Fetch Course Details
  // ===============================
  const fetchCourseDetail = useCallback(async () => {
    if (!courseId) return;

    try {
      const result = await axios.get("/api/course?courseId=" + courseId);

      setCourseDetail(result.data);

      return result.data;
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to load course details");
    }
  }, [courseId]);

  // ===============================
  // Generate Video Content
  // ===============================
  const generateVideoContent = useCallback(
    async (course: Course) => {
      if (isGenerating) return;

      setIsGenerating(true);

      const chapters = Array.isArray(course?.courseLayout?.chapters)
        ? course.courseLayout.chapters
        : [];

      if (chapters.length === 0) return;

      const toastLoading = toast.loading(
        "Generating content for: " + chapters[0].chapterTitle,
      );

      try {
        await axios.post("/api/generate-video-content", {
          chapter: chapters[0],
          chapterId: chapters[0].chapterId || "0",
          courseId: courseId,
        });

        toast.success("Video content generated!", {
          id: toastLoading,
        });

        // Refetch updated course data
        await fetchCourseDetail();
      } catch (error) {
        console.error("Generation error:", error);
        toast.error("Failed to generate content", {
          id: toastLoading,
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [courseId, isGenerating, fetchCourseDetail],
  );

  // ===============================
  // Initial Load
  // ===============================
  // Inside CoursePreview component
  const hasFetched = useRef(false);

  useEffect(() => {
    const init = async () => {
      // Only run this logic once
      if (hasFetched.current) return;

      const data = await fetchCourseDetail();
      if (data && data.chapterContentSlides?.length === 0) {
        hasFetched.current = true; // Mark as called
        await generateVideoContent(data);
      }
    };
    init();
  }, [fetchCourseDetail, generateVideoContent]);

  // ===============================
  // Calculate Audio Durations
  // ===============================
  useEffect(() => {
    let cancelled = false;

    const calculateAudioDurations = async () => {
      const slides = courseDetail?.chapterContentSlides ?? [];

      if (slides.length === 0) {
        setLoading(false);
        return;
      }

      const durationMap: Record<string, number> = {};

      // Fetch audio duration for each slide
      const promises = slides.map(async (slide) => {
        try {
          // Create an audio element to get duration
          const audio = new Audio();

          return new Promise<[string, number]>((resolve) => {
            audio.addEventListener("loadedmetadata", () => {
              // Convert seconds to frames (at 30 fps)
              const frames = Math.max(30, Math.ceil(audio.duration * fps));
              resolve([slide.slideId, frames]);
            });

            audio.addEventListener("error", () => {
              console.warn(
                `Failed to load audio for ${slide.slideId}, using default duration`,
              );
              // Use default 6 second (180 frames) duration on error
              resolve([slide.slideId, Math.ceil(6 * fps)]);
            });

            // Set timeout to avoid hanging
            const timeout = setTimeout(() => {
              console.warn(
                `Audio load timeout for ${slide.slideId}, using default duration`,
              );
              resolve([slide.slideId, Math.ceil(6 * fps)]);
            }, 5000);

            audio.addEventListener(
              "canplaythrough",
              () => clearTimeout(timeout),
              { once: true },
            );

            audio.src = slide.audioFileUrl;
            audio.load();
          });
        } catch (error) {
          console.error(
            `Error calculating duration for ${slide.slideId}:`,
            error,
          );
          // Return default duration on error
          return [slide.slideId, Math.ceil(6 * fps)] as [string, number];
        }
      });

      const results = await Promise.all(promises);

      if (!cancelled) {
        results.forEach(([slideId, frames]) => {
          durationMap[slideId] = frames;
        });
        setDurationBySlideId(durationMap);
        setLoading(false);
      }
    };

    calculateAudioDurations();

    return () => {
      cancelled = true;
    };
  }, [courseDetail, fps]);

  // ===============================
  // UI
  // ===============================
  if (!courseDetail) {
    return <div className="p-6">Loading course...</div>;
  }

  return (
    <div className="flex flex-col items-center">
      <CourseInfoCard
        course={courseDetail}
        durationBySlideId={durationBySlideId}
      />
      <CourseChapter
        course={courseDetail}
        durationBySlideId={durationBySlideId}
      />
    </div>
  );
}

export default CoursePreview;
