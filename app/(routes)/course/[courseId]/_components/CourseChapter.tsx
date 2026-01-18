import React from "react";
import { Course } from "@/type/CourseType";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dot } from "lucide-react";
import { Player } from "@remotion/player";
import ChapterVideo from "./ChapterVideo";

type Props = {
  course: Course | undefined;
};

function CourseChapter({ course }: Props) {
  return (
    <div
      className="max-w-6xl -mt-5 p-10 border rounded-3xl shadow w-full
    bg-background/80 backdrop-blur
    "
    >
      <div className="flex justify-between items-center ">
        <h2 className="font-bold text-2xl">Course Preivew</h2>
        <h2 className="text-sm text-muted-foreground">
          Chapters and Short Preview
        </h2>
      </div>

      <div className="mt-5">
        {course?.courseLayout?.chapters &&
          Array.isArray(course.courseLayout.chapters) &&
          course.courseLayout.chapters.map((chapter, index) => (
            <Card key={index} className="mb-5">
              <CardHeader>
                <div className="flex gap-3 items-center">
                  <h2 className="p-2 bg-primary/60 inline-flex h-10 w-10 text-center rounded-2xl justify-center">
                    {index + 1}
                  </h2>
                  <CardTitle className="md:text-xl text-base">
                    {chapter.chapterTitle}
                  </CardTitle>
                </div>

                <CardContent>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      {chapter?.subContent.map((content: any, index: any) => (
                        <div
                          key={index}
                          className="flex gap-2 items-center mt-2"
                        >
                          <Dot className="h-5 w-5 text-primary" />
                          <h2>{content}</h2>
                        </div>
                      ))}
                    </div>

                    <div>
                      <Player
                        className="border-2 border-white/10 rounded-2xl"
                        component={ChapterVideo}
                        durationInFrames={30}
                        compositionWidth={1280}
                        compositionHeight={720}
                        fps={30}
                        controls
                        style={{
                          width: "80%",
                          height: '180px',
                          aspectRatio: "16/9",
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </CardHeader>
            </Card>
          ))}
      </div>
    </div>
  );
}

export default CourseChapter;
