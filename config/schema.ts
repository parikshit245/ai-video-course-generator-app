import {
  integer,
  json,
  pgTable,
  text,
  timestamp,
  varchar,
  customType // Import customType for Bytea
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
  // Adding these methods helps Drizzle map the data correctly
  toDriver(value: Buffer) {
    return value;
  },
  fromDriver(value: unknown) {
    return value as Buffer;
  }
});

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  credits: integer().default(2),
});

export const coursesTable = pgTable("courses", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 })
    .notNull()
    .references(() => usersTable.email),
  courseId: varchar({ length: 255 }).notNull().unique(),
  courseName: varchar({ length: 255 }).notNull(),
  userInput: varchar({ length: 1024 }).notNull(),
  type: varchar({ length: 100 }).notNull(),
  courseLayout: json(),
  createdAt: timestamp().defaultNow(),
});


export const chapterContentSlides = pgTable("chapter_content_slides", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  courseId: varchar({ length: 255 })
    .notNull()
    .references(() => coursesTable.courseId),
  chapterId: varchar({ length: 255 }).notNull(),
  slideId: varchar({ length: 255 }).notNull(),
  slideIndex: integer().notNull(),
  // Use the helper here
  audioData: bytea("audio_data"), 
  narration: json().notNull(),
  html: text(),
  revelData: json().notNull(),
});