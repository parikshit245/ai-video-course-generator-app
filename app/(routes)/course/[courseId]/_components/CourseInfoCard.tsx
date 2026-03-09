"use client";
import { Course } from "@/type/CourseType";
import {
  BookOpen,
  ChartNoAxesColumnIncreasingIcon,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { Player } from "@remotion/player";
import { getAudioData } from "@remotion/media-utils";
import { CourseComposition } from "./ChapterVideo";

type Props = {
  course: Course | undefined;
  durationBySlideId: Record<string, number>;
};

function CourseInfoCard({ course, durationBySlideId }: Props) {
  const fps = 30;
  const slides = course?.chapterContentSlides ?? [];

  const durationInFrames = useMemo(() => {
    if (!durationBySlideId) return;
    return slides.reduce((sum, slide) => {
      return sum + (durationBySlideId[slide.slideId] ?? fps * 6);
    }, 0);
  }, [durationBySlideId, slides, fps]);

  if (!durationBySlideId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full max-w-5xl mt-10">
      <div
        className="p-10 md:p-16 rounded-3xl grid grid-cols-1 md:grid-cols-2 gap-10
      bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 border border-white/10 shadow-2xl"
      >
        <div className="flex flex-col justify-center">
          <h2 className="gap-2 p-1 px-3 border rounded-full inline-flex items-center text-xs font-medium text-emerald-400 border-emerald-400/30 bg-emerald-400/5 w-fit">
            <Sparkles size={14} /> Course Preview
          </h2>
          <h1 className="text-3xl md:text-4xl font-bold mt-5 text-white tracking-tight">
            {course?.courseName}
          </h1>
          <p className="text-base text-slate-400 mt-4 leading-relaxed line-clamp-3">
            {course?.courseLayout?.courseDescription}
          </p>

          <div className="mt-8 flex flex-wrap gap-4 text-white">
            <div className="px-4 py-2 border rounded-2xl gap-2 items-center inline-flex bg-white/5 border-white/10">
              <ChartNoAxesColumnIncreasingIcon
                size={18}
                className="text-sky-400"
              />
              <span className="text-sm">{course?.courseLayout?.level}</span>
            </div>

            <div className="px-4 py-2 border rounded-2xl gap-2 items-center inline-flex bg-white/5 border-white/10">
              <BookOpen size={18} className="text-emerald-400" />
              <span className="text-sm">
                {course?.courseLayout?.totalChapters} Chapters
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          {
            <div className="w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10">
              <Player
                component={CourseComposition}
                durationInFrames={
                  30
                } // A sufficiently large number; ChapterVideo handles slide timing
                compositionWidth={1280}
                compositionHeight={720}
                fps={fps}
                controls
                inputProps={{
                  //@ts-ignore
                  slides: slides,
                  durationsBySlideId: durationBySlideId,
                }}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>
          }
        </div>
      </div>
    </div>
  );
}

export default CourseInfoCard;
