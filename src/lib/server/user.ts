import * as table from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { db } from "./db";
import { decrypt, decryptToString, encrypt, encryptString } from "./encryption";
import { generateRandomRecoveryCode } from "./utils";
import { hashPassword } from './password';

export function verifyUsernameInput(username: string): boolean {
  return username.length > 3 && username.length < 32 && username.trim() === username;
}

export async function createUser(email: string, username: string, password: string): Promise<User> {
  const passwordHash = await hashPassword(password);
  const recoveryCode = generateRandomRecoveryCode();
  const encryptedRecoveryCode = encryptString(recoveryCode);

  const [row] = await db.insert(table.user)
    .values({ username, email, passwordHash, recoveryCode: Buffer.from(encryptedRecoveryCode) })
    .returning({ id: table.user.id });

  // Sicherstellen, dass eine ID zurückgegeben wurde
  if (!row) {
    throw new Error("Unexpected error");
  }

  // Benutzer-Objekt erstellen
  const user: User = {
    id: row.id,
    email,
    username,
    emailVerified: false,
    registered2FA: false,
  };

  return user;
}

export async function updateUserPassword(userId: number, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await db.update(table.user)
    .set({ passwordHash })
    .where(eq(table.user.id, userId));
}

export async function updateUserEmailAndSetEmailAsVerified(userId: number, email: string): Promise<void> {
  await db.update(table.user)
    .set({ email, emailVerified: true })
    .where(eq(table.user.id, userId));
}

export async function setUserAsEmailVerifiedIfEmailMatches(userId: number, email: string): Promise<boolean> {
  const [oldResult] = await db.select({ emailVerified: table.user.emailVerified }).from(table.user).where(eq(table.user.id, userId));
  const [result] = await db.update(table.user)
    .set({ emailVerified: true })
    .where(
      and(
        eq(table.user.id, userId),
        eq(table.user.email, email)
      )
    ).returning();
  return oldResult.emailVerified !== result.emailVerified ? false : true;
  // return result.changes > 0;
}

export async function getUserPasswordHash(userId: number): Promise<string> {
  const row = await db.select({ passwordHash: table.user.passwordHash }).from(table.user).where(eq(table.user.id, userId)).limit(1);
  if (!row || row.length === 0) {
    throw new Error("Invalid user ID");
  }
  return row[0].passwordHash;
}

export async function getUserRecoverCode(userId: number): Promise<string> {
  const row = await db.select({ recoveryCode: table.user.recoveryCode }).from(table.user).where(eq(table.user.id, userId)).limit(1);
  if (!row || row.length === 0) {
    throw new Error("Invalid user ID");
  }
  const encrypted = new Uint8Array(row[0].recoveryCode);
  return decryptToString(encrypted);
}

export async function getUserTOTPKey(userId: number): Promise<Uint8Array | null> {
  const row = await db.select({ totpKey: table.user.totpKey }).from(table.user).where(eq(table.user.id, userId)).limit(1);

  if (!row || row.length === 0) {
    throw new Error("Invalid user ID");
  }
  const encryptedBuffer = row[0].totpKey;
  if (encryptedBuffer === null) {
    return null;
  }
  const encrypted = new Uint8Array(encryptedBuffer);
  return decrypt(encrypted);
}

export async function updateUserTOTPKey(userId: number, key: Uint8Array): Promise<void> {
  const encrypted = Buffer.from(encrypt(key));
  await db.update(table.user).set({ totpKey: encrypted }).where(eq(table.user.id, userId));
}

export async function resetUserRecoveryCode(userId: number): Promise<string> {
  const recoveryCode = generateRandomRecoveryCode();
  const encrypted = Buffer.from(encryptString(recoveryCode));
  await db.update(table.user).set({ recoveryCode: encrypted }).where(eq(table.user.id, userId));
  return recoveryCode;
}

export async function getUserFromEmail(email: string): Promise<User | null> {
  const row = await db.select({
    id: table.user.id,
    email: table.user.email,
    username: table.user.username,
    emailVerified: table.user.emailVerified,
    registered2FA: table.user.registered2FA,
    totpKey: table.user.totpKey
  })
    .from(table.user)
    .where(eq(table.user.email, email))
    .limit(1);

  if (!row || row.length === 0) {
    return null;
  }
  const user: User = {
    id: row[0].id,
    email: row[0].email,
    username: row[0].username,
    emailVerified: row[0].emailVerified,
    registered2FA: row[0].registered2FA !== null,
  };
  return user;
}

export interface User {
  id: number;
  email: string;
  username: string;
  emailVerified: boolean;
  registered2FA: boolean;
}