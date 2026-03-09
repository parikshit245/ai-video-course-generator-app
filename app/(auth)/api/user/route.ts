export const runtime = "nodejs";

import { db } from "@/config/db";
import { usersTable } from "@/config/schema";
import { isDatabaseConnectionError, upsertLocalUser } from "@/lib/dbFallback";
import { eq } from "drizzle-orm";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName || user?.firstName || "User";

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (users.length === 0) {
      const newUser = await db
        .insert(usersTable)
        .values({
          email,
          name,
        })
        .returning();

      return NextResponse.json(newUser[0]);
    }

    return NextResponse.json(users[0]);
  } catch (error) {
    if (!isDatabaseConnectionError(error)) {
      console.error("User API database error:", error);
      return NextResponse.json(
        { error: "Failed to load user profile" },
        { status: 500 },
      );
    }

    console.warn("Database unavailable in /api/user, using local fallback");
    const fallbackUser = await upsertLocalUser({ email, name });

    return NextResponse.json(fallbackUser);
  }
}
