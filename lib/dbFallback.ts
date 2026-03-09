import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type StoredUser = {
  id: number;
  name: string;
  email: string;
  credits: number;
};

type StoredCourse = {
  id: number;
  userId: string;
  courseId: string;
  courseName: string;
  userInput: string;
  type: string;
  courseLayout: unknown;
  createdAt: string;
};

type StoredSlide = {
  id: number;
  courseId: string;
  chapterId: string;
  slideId: string;
  slideIndex: number;
  audioFileName: string;
  audioFileUrl: string;
  narration: unknown;
  html: string;
  revealData: unknown;
};

type LocalStore = {
  users: StoredUser[];
  courses: StoredCourse[];
  chapterContentSlides: StoredSlide[];
};

type ErrorLike = {
  message?: string;
  cause?: unknown;
  code?: string;
};

const STORE_DIRECTORY = path.join(process.cwd(), ".local-data");
const STORE_FILE = path.join(STORE_DIRECTORY, "db-fallback.json");

const EMPTY_STORE: LocalStore = {
  users: [],
  courses: [],
  chapterContentSlides: [],
};

const toErrorLike = (value: unknown): ErrorLike | null => {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  return value as ErrorLike;
};

const readStore = async (): Promise<LocalStore> => {
  try {
    const content = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(content) as Partial<LocalStore>;

    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      courses: Array.isArray(parsed.courses) ? parsed.courses : [],
      chapterContentSlides: Array.isArray(parsed.chapterContentSlides)
        ? parsed.chapterContentSlides
        : [],
    };
  } catch (error) {
    const fileError = toErrorLike(error);

    if (fileError?.code === "ENOENT") {
      return EMPTY_STORE;
    }

    throw error;
  }
};

const writeStore = async (store: LocalStore) => {
  await mkdir(STORE_DIRECTORY, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
};

const nextId = <T extends { id: number }>(items: T[]) =>
  items.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1;

const collectErrorSignals = (error: unknown, signals: string[] = []): string[] => {
  const errorLike = toErrorLike(error);

  if (!errorLike) {
    if (typeof error === "string") {
      signals.push(error);
    }

    return signals;
  }

  if (typeof errorLike.message === "string") {
    signals.push(errorLike.message);
  }

  if (typeof errorLike.code === "string") {
    signals.push(errorLike.code);
  }

  if (errorLike.cause) {
    collectErrorSignals(errorLike.cause, signals);
  }

  return signals;
};

export const isDatabaseConnectionError = (error: unknown) => {
  const signalText = collectErrorSignals(error).join(" ").toLowerCase();

  return [
    "fetch failed",
    "enotfound",
    "econnreset",
    "etimedout",
    "failed to connect",
    "error connecting to database",
  ].some((signal) => signalText.includes(signal));
};

export const upsertLocalUser = async (input: {
  email: string;
  name: string;
}) => {
  const store = await readStore();
  const existingUser = store.users.find((user) => user.email === input.email);

  if (existingUser) {
    const updatedUser = {
      ...existingUser,
      name: input.name || existingUser.name,
    };

    store.users = store.users.map((user) =>
      user.email === input.email ? updatedUser : user,
    );
    await writeStore(store);
    return updatedUser;
  }

  const newUser: StoredUser = {
    id: nextId(store.users),
    email: input.email,
    name: input.name,
    credits: 2,
  };

  store.users.push(newUser);
  await writeStore(store);
  return newUser;
};

export const saveLocalCourse = async (input: {
  userId: string;
  courseId: string;
  courseName: string;
  userInput: string;
  type: string;
  courseLayout: unknown;
}) => {
  const store = await readStore();
  const existingCourse = store.courses.find(
    (course) => course.courseId === input.courseId,
  );

  const storedCourse: StoredCourse = {
    id: existingCourse?.id ?? nextId(store.courses),
    userId: input.userId,
    courseId: input.courseId,
    courseName: input.courseName,
    userInput: input.userInput,
    type: input.type,
    courseLayout: input.courseLayout,
    createdAt: existingCourse?.createdAt ?? new Date().toISOString(),
  };

  store.courses = [
    ...store.courses.filter((course) => course.courseId !== input.courseId),
    storedCourse,
  ];

  await writeStore(store);
  return storedCourse;
};

export const getLocalCourse = async (courseId: string) => {
  const store = await readStore();
  const course = store.courses.find((entry) => entry.courseId === courseId);

  if (!course) {
    return null;
  }

  return {
    ...course,
    chapterContentSlides: store.chapterContentSlides
      .filter((slide) => slide.courseId === courseId)
      .sort((left, right) => left.slideIndex - right.slideIndex),
  };
};

export const saveLocalSlides = async (
  courseId: string,
  chapterId: string,
  slides: Array<{
    slideIndex: number;
    slideId: string;
    audioFileName: string;
    audioFileUrl: string;
    narration: unknown;
    html: string;
    revealData: unknown;
  }>,
) => {
  const store = await readStore();

  const existingSlides = store.chapterContentSlides.filter(
    (slide) => !(slide.courseId === courseId && slide.chapterId === chapterId),
  );

  const newSlides = slides.map((slide, index) => ({
    id: nextId([...store.chapterContentSlides, ...existingSlides]) + index,
    courseId,
    chapterId,
    slideIndex: slide.slideIndex,
    slideId: slide.slideId,
    audioFileName: slide.audioFileName,
    audioFileUrl: slide.audioFileUrl,
    narration: slide.narration,
    html: slide.html,
    revealData: slide.revealData,
  }));

  store.chapterContentSlides = [...existingSlides, ...newSlides];
  await writeStore(store);

  return newSlides.sort((left, right) => left.slideIndex - right.slideIndex);
};