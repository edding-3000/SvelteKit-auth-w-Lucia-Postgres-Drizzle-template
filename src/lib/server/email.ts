import { eq, count } from "drizzle-orm";
import { db } from "./db";
import * as table from '$lib/server/db/schema';

export function verifyEmailInput(email: string): boolean {
  return /^.+@.+\..+$/.test(email) && email.length < 256;
}

export async function checkEmailAvailability(email: string): Promise<boolean> {
  const [row] = await db.select({ count: count() }).from(table.user).where(eq(table.user.email, email))
  if (row === null || row === undefined) {
    throw new Error();
  }
  return row.count === 0;
}