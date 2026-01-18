export type Course = {
  courseId: string;
  courseName: string;
  type: string;
  createdAt: string;
  id: number;
  courseLayout: courseLayout;
};

export type courseLayout = {
  courseId: string;
  courseName: string;
  courseDescription: string;
  level: string;
  totalChapters: number;
  chapters: Chapter;
};

export type Chapter = {
  chapterId: string;
  chapterTitle: string;
  subContent: string[];
};
