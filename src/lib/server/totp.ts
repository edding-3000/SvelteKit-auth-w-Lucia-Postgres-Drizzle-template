import * as table from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { decrypt, encrypt } from "./encryption";
import { ExpiringTokenBucket, RefillingTokenBucket } from './rate-limit';

export const totpBucket = new ExpiringTokenBucket<number>(5, 60 * 30);
export const totpUpdateBucket = new RefillingTokenBucket<number>(3, 60 * 10);

export async function getUserTOTPKey(userId: number): Promise<Uint8Array | null> {
  const row = await db.select({ totpKey: table.totpCredential.key }).from(table.totpCredential).where(eq(table.totpCredential.userId, userId)).limit(1);

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
  const encrypted = encrypt(key);
  try {
    await db.transaction(async (tx) => {
      await db.delete(table.totpCredential).where(eq(table.totpCredential.userId, userId));
      await tx.insert(table.totpCredential).values({ userId: userId, key: encrypted });
    })
  } catch (e) {
    throw e;
  }
}

export async function deleteUserTOTPKey(userId: number): Promise<void> {
  await db.delete(table.totpCredential).where(eq(table.totpCredential.userId, userId));
}