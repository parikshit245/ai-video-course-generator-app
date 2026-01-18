"use client";
import React, { useEffect, useState } from "react";
import CourseInfoCard from "./_components/CourseInfoCard";
import axios from "axios";
import { useParams } from "next/navigation";
import { Course } from "@/type/CourseType";
import CourseChapter from "./_components/CourseChapter";

function CoursePreview() {
  const { courseId } = useParams();
  const [courseDetail, setCourseDetail] = useState<Course>()

  useEffect(() => {
    courseId && GetCourseDetail();
  }, [courseId]);

  const GetCourseDetail = async () => {
    const result = await axios.get("/api/course?courseId=" + courseId);
    console.log(result.data);
    setCourseDetail(result.data)
  };

  return (
    <div className="flex flex-col items-center">
      <CourseInfoCard course={courseDetail} />
      <CourseChapter course={courseDetail}/>
    </div>
  );
}

export default CoursePreview;
