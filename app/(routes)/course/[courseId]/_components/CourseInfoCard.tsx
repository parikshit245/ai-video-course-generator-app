import { Course } from "@/type/CourseType";
import {
  BookOpen,
  ChartNoAxesColumnIncreasingIcon,
  Sparkles,
} from "lucide-react";
import React from "react";
import { Player } from "@remotion/player";
import ChapterVideo from "./ChapterVideo";

type Props = {
  course: Course | undefined;
};

function CourseInfoCard({ course }: Props) {
  return (
    <div>
      <div
        className="p-20 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-5
      bg-linear-to-br from-slate-950 via-slate-800 to-emerald-950"
      >
        <div>
          <h2 className=" gap-2 p-1 px-2 border rounded-2xl inline-flex text-white border-gray-200/70">
            <Sparkles /> Course Preview
          </h2>
          <h2 className="text-4xl font-bold mt-4 text-white">
            {course?.courseName}
          </h2>
          <p className="text-lg text-muted-foreground mt-3">
            {course?.courseLayout?.courseDescription}
          </p>
          <div className="mt-5 flex gap-5 text-white">
            <h2 className="px-3 p-2 border rounded-4xl  gap-2 items-center inline-flex">
              <ChartNoAxesColumnIncreasingIcon className="text-sky-400" />
              {course?.courseLayout?.level}
            </h2>

            <h2 className="px-3 p-2 border rounded-4xl  gap-2 items-center inline-flex">
              <BookOpen className="text-green-300" />
              {course?.courseLayout?.totalChapters} Chapters
            </h2>
          </div>
        </div>

        <div>
          <Player className="border-2 border-white/10 rounded-2xl"
            component={ChapterVideo}
            durationInFrames={30}
            compositionWidth={1280}
            compositionHeight={720}
            fps={30}
            controls
            style={{
              width: "100%",
              aspectRatio: "16/9",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default CourseInfoCard;
